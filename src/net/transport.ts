import type { Action, GameState } from '@/game/engine';

/**
 * How phones in a room talk to each other. The host publishes the game state;
 * everyone else sends actions to the host. Implementations:
 *  - supabaseTransport: real phones over the internet (needs Supabase keys)
 *  - broadcastTransport: several browser tabs on one computer (for testing on web)
 *  - none: practice mode with bots on a single phone
 */

export interface StateMessage {
  state: GameState;
  /** Host clock when sent, so guests can correct countdowns for clock differences. */
  sentAt: number;
}

export interface ActionMessage {
  action: Action;
  from: string;
}

export interface RoomTransport {
  readonly kind: 'supabase' | 'relay' | 'broadcast';
  publishState(msg: StateMessage): void;
  sendAction(msg: ActionMessage): void;
  /** Guests call this to ask the host to re-send the state (on join / reconnect). */
  requestState(): void;
  onState(cb: (msg: StateMessage) => void): void;
  onAction(cb: (msg: ActionMessage) => void): void;
  onStateRequest(cb: () => void): void;
  close(): void;
}

/** The bank is large and only the host needs it, so it is stripped before publishing. */
export function publishable(state: GameState): GameState {
  return { ...state, bank: [] };
}
