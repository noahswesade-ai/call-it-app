import mqtt, { type MqttClient } from 'mqtt';
import type { ActionMessage, RoomTransport, StateMessage } from './transport';

/**
 * Internet relay over MQTT-on-WebSockets using free public brokers (no account or
 * server of our own). Used for play-testing across phones until Supabase is set up.
 *
 * Every phone connects to SEVERAL brokers at once and sends every message through
 * all of them; receivers drop duplicates by message id. If one public broker goes
 * down (as broker.emqx.io did), the game keeps working through the others.
 *
 * Topics (per room code):
 *   <prefix>/<CODE>/state    host → everyone (retained, so late joiners and
 *                            reconnecting phones get the latest state immediately)
 *   <prefix>/<CODE>/action   phones → host
 *   <prefix>/<CODE>/hello    "please re-send the state"
 *
 * EXPO_PUBLIC_RELAY_URL: one or more broker URLs, comma-separated.
 */

const RELAY_URLS = (process.env.EXPO_PUBLIC_RELAY_URL ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const PREFIX = 'underdog-party-game-v1';

export function relayConfigured(): boolean {
  return RELAY_URLS.length > 0;
}

type Envelope = { id: string; data: unknown };

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Live count of connected brokers, for the lobby's online indicator. */
let connectedCount = 0;
const statusListeners = new Set<(online: boolean) => void>();
function setConnected(delta: number) {
  connectedCount = Math.max(0, connectedCount + delta);
  statusListeners.forEach((l) => l(connectedCount > 0));
}
export function onRelayStatus(cb: (online: boolean) => void): () => void {
  statusListeners.add(cb);
  cb(connectedCount > 0);
  return () => statusListeners.delete(cb);
}

export function createRelayTransport(code: string): RoomTransport {
  const base = `${PREFIX}/${code}`;
  const topics = { state: `${base}/state`, action: `${base}/action`, hello: `${base}/hello` };
  let stateCb: ((m: StateMessage) => void) | undefined;
  let actionCb: ((m: ActionMessage) => void) | undefined;
  let requestCb: (() => void) | undefined;
  const seen = new Set<string>();

  const clients: MqttClient[] = RELAY_URLS.map((url) => {
    const client = mqtt.connect(url, { clean: true, reconnectPeriod: 1500, connectTimeout: 8000, keepalive: 30 });
    let up = false;
    client.on('connect', () => {
      if (!up) setConnected(+1);
      up = true;
      client.subscribe([topics.state, topics.action, topics.hello], { qos: 0 });
      // (Re)connected: ask for the latest state in case we missed anything.
      requestCb?.();
    });
    const down = () => {
      if (up) setConnected(-1);
      up = false;
    };
    client.on('close', down);
    client.on('offline', down);
    client.on('error', () => {});
    client.on('message', (topic, payload) => {
      let env: Envelope;
      try {
        env = JSON.parse(payload.toString());
      } catch {
        return;
      }
      if (!env || typeof env.id !== 'string') return;
      if (seen.has(env.id)) return; // same message via another broker
      seen.add(env.id);
      if (seen.size > 2000) seen.clear();
      if (topic === topics.state) {
        stateCb?.(env.data as StateMessage);
      } else if (topic === topics.action) actionCb?.(env.data as ActionMessage);
      else if (topic === topics.hello) requestCb?.();
    });
    return client;
  });

  // Same message id on every broker so receivers can drop the duplicates.
  const send = (topic: string, data: unknown, retain = false) => {
    const payload = JSON.stringify({ id: newId(), data } satisfies Envelope);
    for (const c of clients) c.publish(topic, payload, { qos: 0, retain });
  };

  return {
    kind: 'relay',
    publishState: (msg) => send(topics.state, msg, true),
    sendAction: (msg) => send(topics.action, msg),
    requestState: () => send(topics.hello, {}),
    onState: (cb) => {
      stateCb = cb;
    },
    onAction: (cb) => {
      actionCb = cb;
    },
    onStateRequest: (cb) => {
      requestCb = cb;
    },
    close: () => {
      for (const c of clients) c.end(false);
    },
  };
}
