import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ActionMessage, RoomTransport, StateMessage } from './transport';

/**
 * Supabase is only used when its keys are set in `.env`
 * (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY). Without them the
 * app still works in practice mode and, on the web, across browser tabs.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | undefined;

export function supabaseConfigured(): boolean {
  return !!url && !!anonKey;
}

export function getSupabase(): SupabaseClient | undefined {
  if (!supabaseConfigured()) return undefined;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** Realtime room channel: the host broadcasts state, guests broadcast actions. */
export function createSupabaseTransport(code: string): RoomTransport {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');
  let stateCb: ((m: StateMessage) => void) | undefined;
  let actionCb: ((m: ActionMessage) => void) | undefined;
  let requestCb: (() => void) | undefined;
  const queue: { event: string; payload: unknown }[] = [];
  let ready = false;

  const channel = sb.channel(`room:${code}`, { config: { broadcast: { self: false, ack: false } } });
  channel
    .on('broadcast', { event: 'state' }, ({ payload }) => stateCb?.(payload as StateMessage))
    .on('broadcast', { event: 'action' }, ({ payload }) => actionCb?.(payload as ActionMessage))
    .on('broadcast', { event: 'stateRequest' }, () => requestCb?.())
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ready = true;
        for (const m of queue.splice(0)) void channel.send({ type: 'broadcast', ...m });
      }
    });

  const send = (event: string, payload: unknown) => {
    if (!ready) queue.push({ event, payload });
    else void channel.send({ type: 'broadcast', event, payload });
  };

  return {
    kind: 'supabase',
    publishState: (msg) => send('state', msg),
    sendAction: (msg) => send('action', msg),
    requestState: () => send('stateRequest', {}),
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
      void sb.removeChannel(channel);
    },
  };
}
