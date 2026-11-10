import type { ActionMessage, RoomTransport, StateMessage } from './transport';

type Envelope =
  | { kind: 'state'; msg: StateMessage }
  | { kind: 'action'; msg: ActionMessage }
  | { kind: 'stateRequest' };

/** True when running in a browser that supports BroadcastChannel (tabs on one computer). */
export function broadcastAvailable(): boolean {
  return typeof globalThis !== 'undefined' && typeof (globalThis as any).BroadcastChannel === 'function';
}

export function createBroadcastTransport(code: string): RoomTransport {
  const channel = new (globalThis as any).BroadcastChannel(`underdog-room-${code}`) as {
    postMessage: (e: Envelope) => void;
    onmessage: ((e: { data: Envelope }) => void) | null;
    close: () => void;
  };
  let stateCb: ((m: StateMessage) => void) | undefined;
  let actionCb: ((m: ActionMessage) => void) | undefined;
  let requestCb: (() => void) | undefined;

  channel.onmessage = ({ data }) => {
    if (data.kind === 'state') stateCb?.(data.msg);
    else if (data.kind === 'action') actionCb?.(data.msg);
    else requestCb?.();
  };

  return {
    kind: 'broadcast',
    publishState: (msg) => channel.postMessage({ kind: 'state', msg }),
    sendAction: (msg) => channel.postMessage({ kind: 'action', msg }),
    requestState: () => channel.postMessage({ kind: 'stateRequest' }),
    onState: (cb) => {
      stateCb = cb;
    },
    onAction: (cb) => {
      actionCb = cb;
    },
    onStateRequest: (cb) => {
      requestCb = cb;
    },
    close: () => channel.close(),
  };
}
