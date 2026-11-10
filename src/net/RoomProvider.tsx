import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { availableCategories } from '@/content/categories';
import { ALL_QUESTIONS } from '@/content/questions';
import { randomStarterAvatar } from '@/avatar/catalog';
import { createGame, reduce, type Action, type GameState } from '@/game/engine';
import { randomId, roomCode } from '@/game/rng';
import type { GameSettings, Player } from '@/game/types';
import { useProfile } from '@/state/profile';
import { broadcastAvailable, createBroadcastTransport } from './broadcastTransport';
import { createSupabaseTransport, supabaseConfigured } from './supabase';
import { createRelayTransport, relayConfigured } from './relayTransport';
import { publishable, type RoomTransport } from './transport';

/**
 * Runs a room on this phone.
 * - Host: owns the GameState, runs the reducer and timers, publishes every change.
 * - Guest: renders the state the host publishes and sends its actions to the host.
 * - Practice: host with bots, no network at all.
 * If the host leaves, the next player who joined is promoted and takes over.
 */

export type Connection = 'practice' | 'supabase' | 'relay' | 'broadcast';

interface RoomApi {
  state?: GameState;
  myId: string;
  isHost: boolean;
  connection?: Connection;
  /** Add this to Date.now() to get the host's clock. */
  clockOffset: number;
  hostRoom: (opts: { practiceBots?: number; mode?: 'classic' | 'party' }) => string;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  dispatch: (action: Action) => void;
  onlineAvailable: boolean;
  /** True on guests' phones while the host is away (app in background or disconnected). */
  hostAway: boolean;
}

const Ctx = createContext<RoomApi | null>(null);

const BOT_NAMES = ['Mittens', 'Biscuit', 'Toad', 'Bruno', 'Pickles', 'Noodle', 'Waffles', 'Pepper', 'Ziggy'];
const TICK_MS = 250;

export function defaultSettings(): GameSettings {
  return {
    mode: 'classic',
    spicy: false,
    rounds: 10,
    categories: availableCategories('classic', false),
  };
}

function openTransport(code: string): { transport?: RoomTransport; connection: Connection } {
  if (supabaseConfigured()) return { transport: createSupabaseTransport(code), connection: 'supabase' };
  if (relayConfigured()) return { transport: createRelayTransport(code), connection: 'relay' };
  if (broadcastAvailable()) return { transport: createBroadcastTransport(code), connection: 'broadcast' };
  return { connection: 'practice' };
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const [state, setState] = useState<GameState>();
  const [isHost, setIsHost] = useState(false);
  const [connection, setConnection] = useState<Connection>();
  const [clockOffset, setClockOffset] = useState(0);
  const transportRef = useRef<RoomTransport | undefined>(undefined);
  const stateRef = useRef<GameState | undefined>(undefined);
  const botsRef = useRef<Set<string>>(new Set());
  const botTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHostRef = useRef(false);

  const me = useCallback(
    (host: boolean): Player => ({
      id: profile.id,
      name: profile.name || 'Player',
      avatar: profile.avatar,
      isHost: host,
      playing: true,
      premium: profile.premium,
      joinOrder: 0,
      connected: true,
    }),
    [profile],
  );

  const applyLocal = useCallback((action: Action) => {
    const prev = stateRef.current;
    if (!prev) return;
    const next = reduce(prev, action);
    if (next !== prev) {
      stateRef.current = next;
      setState(next);
    }
  }, []);

  // Host: publish every change.
  useEffect(() => {
    if (isHost && state && transportRef.current) {
      transportRef.current.publishState({ state: publishable(state), sentAt: Date.now() });
    }
  }, [isHost, state]);

  // Guests: when did we last hear from the host? (The host re-sends the state every
  // few seconds as a heartbeat, so silence means the host's phone is away.)
  const lastStateAtRef = useRef(0);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (isHost || !state) return setStale(false);
    const t = setInterval(() => setStale(Date.now() - lastStateAtRef.current > 12_000), 1000);
    return () => clearInterval(t);
  }, [isHost, state]);

  // Host: heartbeat, so guests can tell the host is still here.
  useEffect(() => {
    if (!isHost) return;
    const t = setInterval(() => {
      if (stateRef.current && transportRef.current) {
        transportRef.current.publishState({ state: publishable(stateRef.current), sentAt: Date.now() });
      }
    }, 4000);
    return () => clearInterval(t);
  }, [isHost]);

  // Host: pause the game while the host's app is in the background, resume on return.
  useEffect(() => {
    if (!isHost) return;
    const sub = AppState.addEventListener('change', (st) => {
      const s = stateRef.current;
      if (!s || s.phase === 'lobby' || s.phase === 'podium') return;
      applyLocal({ type: st === 'active' ? 'resume' : 'pause', now: Date.now() });
    });
    return () => sub.remove();
  }, [isHost, applyLocal]);

  // Host: timers.
  useEffect(() => {
    if (!isHost) return;
    const t = setInterval(() => applyLocal({ type: 'tick', now: Date.now() }), TICK_MS);
    return () => clearInterval(t);
  }, [isHost, applyLocal]);

  // Host: bots bet after a random delay and answer as Know Your Friends subjects.
  const botRoundRef = useRef<string>('');
  useEffect(() => {
    if (!isHost || !state?.round || botsRef.current.size === 0) return;
    const r = state.round;
    const key = `${r.number}-${state.phase}`;
    if (botRoundRef.current === key) return;
    botRoundRef.current = key;
    if (state.phase === 'matchup' && r.subjectId && botsRef.current.has(r.subjectId)) {
      applyLocal({ type: 'subjectAnswer', playerId: r.subjectId, answer: '(a bot — the host judges)' });
    }
    if (state.phase === 'betting') {
      const favorite: 'A' | 'B' = Math.random() < 0.5 ? 'A' : 'B';
      for (const id of r.bettors) {
        if (!botsRef.current.has(id)) continue;
        const delay = 1500 + Math.random() * 9000;
        // Like a real crowd, bots mostly pile onto this round's favorite,
        // which regularly creates an Underdog.
        const roll = Math.random();
        const pick = roll < 0.06 ? 'NONE' : roll < 0.84 ? favorite : favorite === 'A' ? 'B' : 'A';
        botTimers.current.push(
          setTimeout(() => applyLocal({ type: 'bet', playerId: id, pick, now: Date.now() }), delay),
        );
      }
    }
  }, [isHost, state, applyLocal]);

  const attachHostHandlers = useCallback(
    (transport: RoomTransport) => {
      transport.onAction(({ action }) => applyLocal(action));
      transport.onStateRequest(() => {
        if (stateRef.current) {
          transport.publishState({ state: publishable(stateRef.current), sentAt: Date.now() });
        }
      });
    },
    [applyLocal],
  );

  const hostRoom = useCallback(
    ({ practiceBots, mode = 'classic' }: { practiceBots?: number; mode?: 'classic' | 'party' }) => {
      const code = roomCode();
      const settings = { ...defaultSettings(), mode, categories: availableCategories(mode, false) };
      let game = createGame({ code, host: me(true), settings, bank: ALL_QUESTIONS });
      botsRef.current = new Set();
      if (practiceBots) {
        for (let i = 0; i < practiceBots; i++) {
          const id = `bot-${randomId()}`;
          botsRef.current.add(id);
          game = reduce(game, {
            type: 'join',
            player: {
              id,
              name: BOT_NAMES[i % BOT_NAMES.length],
              avatar: randomStarterAvatar(),
              isHost: false,
              playing: true,
              premium: false,
              joinOrder: 0,
              connected: true,
            },
          });
        }
        setConnection('practice');
      } else {
        const { transport, connection: conn } = openTransport(code);
        transportRef.current = transport;
        setConnection(conn);
        if (transport) attachHostHandlers(transport);
      }
      stateRef.current = game;
      isHostRef.current = true;
      setIsHost(true);
      setClockOffset(0);
      setState(game);
      return code;
    },
    [me, attachHostHandlers],
  );

  const joinRoom = useCallback(
    (code: string) => {
      const { transport, connection: conn } = openTransport(code.toUpperCase());
      if (!transport) return;
      transportRef.current = transport;
      setConnection(conn);
      isHostRef.current = false;
      setIsHost(false);
      transport.onState(({ state: s, sentAt }) => {
        if (isHostRef.current) return;
        lastStateAtRef.current = Date.now();
        setClockOffset(sentAt - Date.now());
        // Host migration: if the host left and we're next in line, take over.
        if (s.hostId === profile.id) {
          const promoted = { ...s, bank: ALL_QUESTIONS };
          stateRef.current = promoted;
          isHostRef.current = true;
          setIsHost(true);
          setClockOffset(0);
          attachHostHandlers(transport);
          setState(promoted);
          return;
        }
        stateRef.current = s;
        setState(s);
      });
      // Keep asking to join until the host's phone has us in the room. A host who
      // briefly switched apps (e.g. to text the code) misses one-off messages.
      const ask = () => {
        if (isHostRef.current || transportRef.current !== transport) return clearInterval(retry);
        if (stateRef.current?.players.some((p) => p.id === profile.id)) return;
        if (stateRef.current?.kicked?.includes(profile.id)) return clearInterval(retry);
        transport.sendAction({ action: { type: 'join', player: me(false) }, from: profile.id });
        transport.requestState();
      };
      ask();
      const retry = setInterval(ask, 2000);
    },
    [me, profile.id, attachHostHandlers],
  );

  const leaveRoom = useCallback(() => {
    const t = transportRef.current;
    if (t) {
      if (isHostRef.current && stateRef.current) {
        const next = reduce(stateRef.current, { type: 'leave', playerId: profile.id });
        t.publishState({ state: publishable(next), sentAt: Date.now() });
      } else {
        t.sendAction({ action: { type: 'leave', playerId: profile.id }, from: profile.id });
      }
      setTimeout(() => t.close(), 300);
    }
    botTimers.current.forEach(clearTimeout);
    botTimers.current = [];
    transportRef.current = undefined;
    stateRef.current = undefined;
    isHostRef.current = false;
    botsRef.current = new Set();
    setIsHost(false);
    setConnection(undefined);
    setState(undefined);
  }, [profile.id]);

  const dispatch = useCallback(
    (action: Action) => {
      if (isHostRef.current) applyLocal(action);
      else transportRef.current?.sendAction({ action, from: profile.id });
    },
    [applyLocal, profile.id],
  );

  // Keep my name/avatar in sync if I edit them while in a lobby.
  useEffect(() => {
    if (!stateRef.current) return;
    const mine = stateRef.current.players.find((p) => p.id === profile.id);
    if (mine && (mine.name !== profile.name || mine.avatar !== profile.avatar)) {
      dispatch({ type: 'updatePlayer', playerId: profile.id, patch: { name: profile.name, avatar: profile.avatar } });
    }
  }, [profile.name, profile.avatar, profile.id, dispatch]);

  const api = useMemo<RoomApi>(
    () => ({
      state,
      myId: profile.id,
      isHost,
      connection,
      clockOffset,
      hostRoom,
      joinRoom,
      leaveRoom,
      dispatch,
      onlineAvailable: supabaseConfigured() || relayConfigured() || broadcastAvailable(),
      hostAway: !isHost && !!state && state.phase !== 'lobby' && (stale || !!state.paused),
    }),
    [state, profile.id, isHost, connection, clockOffset, hostRoom, joinRoom, leaveRoom, dispatch, stale],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useRoom(): RoomApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRoom must be used inside RoomProvider');
  return ctx;
}

/** Ids of practice bots can't be known by guests; bots only exist on the host. */
export function isBotId(id: string): boolean {
  return id.startsWith('bot-');
}
