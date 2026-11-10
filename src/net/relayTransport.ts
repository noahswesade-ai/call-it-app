import mqtt from 'mqtt';
import type { ActionMessage, RoomTransport, StateMessage } from './transport';

/**
 * Internet relay over MQTT-on-WebSockets (no account or server of our own needed).
 * Used for play-testing across phones until Supabase is set up.
 *
 * Topics (per room code):
 *   <prefix>/<CODE>/state    host → everyone (retained, so late joiners and
 *                            reconnecting phones get the latest state immediately)
 *   <prefix>/<CODE>/action   phones → host
 *   <prefix>/<CODE>/hello    "please re-send the state"
 *
 * Set EXPO_PUBLIC_RELAY_URL (e.g. wss://broker.emqx.io:8084/mqtt) to enable.
 */

const RELAY_URL = process.env.EXPO_PUBLIC_RELAY_URL;
const PREFIX = 'underdog-party-game-v1';

export function relayConfigured(): boolean {
  return !!RELAY_URL;
}

export function createRelayTransport(code: string): RoomTransport {
  const base = `${PREFIX}/${code}`;
  const topics = { state: `${base}/state`, action: `${base}/action`, hello: `${base}/hello` };
  let stateCb: ((m: StateMessage) => void) | undefined;
  let actionCb: ((m: ActionMessage) => void) | undefined;
  let requestCb: (() => void) | undefined;
  const client = mqtt.connect(RELAY_URL!, {
    clean: true,
    reconnectPeriod: 1500,
    connectTimeout: 10_000,
    keepalive: 30,
  });

  client.on('connect', () => {
    client.subscribe([topics.state, topics.action, topics.hello], { qos: 0 });
  });

  client.on('message', (topic, payload) => {
    let data: unknown;
    try {
      data = JSON.parse(payload.toString());
    } catch {
      return;
    }
    if (topic === topics.state) stateCb?.(data as StateMessage);
    else if (topic === topics.action) actionCb?.(data as ActionMessage);
    else if (topic === topics.hello) requestCb?.();
  });

  // mqtt.js queues publishes while (re)connecting, so nothing is lost on a blip.
  const send = (topic: string, data: unknown, retain = false) =>
    client.publish(topic, JSON.stringify(data), { qos: 0, retain });

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
      client.end(false);
    },
  };
}
