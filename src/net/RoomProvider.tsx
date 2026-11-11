import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

/**
 * Question ids this phone has seen (shared with any room it joins or hosts). Saved on
 * the phone, so the next game night doesn't repeat last week's questions either.
 */
const sessionSeen = new Set<string>();
const SEEN_KEY = 'callit.seen.v1';
const SEEN_MAX = 3000;
let seenLoaded = false;
function loadSeen() {
  if (seenLoaded) return;
  seenLoaded = true;
  AsyncStorage.getItem(SEEN_KEY)
    .then((raw) => {
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      // Older entries first, so newer ones stay "most recent" in insertion order.
      const now = [...sessionSeen];
      sessionSeen.clear();
      for (const id of [...ids, ...now]) sessionSeen.add(id);
    })
    .catch(() => {});
}
function saveSeen() {
  const ids = [...sessionSeen].slice(-SEEN_MAX);
  void AsyncStorage.setItem(SEEN_KEY, JSON.stringify(ids)).catch(() => {});
}
const PING_MS = 5000;
/** A guest silent for this long is removed from the game. */
const GONE_MS = 45_000;
/** With no word from the host for this long, the next player in line takes over hosting. */
const HOST_GONE_MS = 30_000;
const HOST_PAUSED_GONE_MS = 45_000;

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
  const lastSeenRef = useRef<Record<string, number>>({});
  const joinLoopRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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
    const t = setInterval(() => {
      const gap = Date.now() - lastStateAtRef.current;
      setStale(gap > 12_000);
      maybeTakeOver(gap);
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, !!state]);

  // Every phone remembers which questions it has seen since the app was opened.
  useEffect(loadSeen, []);
  useEffect(() => {
    const id = state?.round?.question.id;
    if (id && !state?.round?.question.repeatable && !sessionSeen.has(id)) {
      sessionSeen.add(id);
      saveSeen();
    }
  }, [state?.round?.question.id, state?.round?.question.repeatable]);

  // Guests: tell the host we're still here.
  useEffect(() => {
    if (isHost || !state) return;
    const t = setInterval(() => {
      transportRef.current?.sendAction({ action: { type: 'ping' }, from: profile.id });
    }, PING_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, !!state, profile.id]);

  // Host: remove players whose phones have gone completely silent.
  useEffect(() => {
    if (!isHost || connection === 'practice') return;
    lastSeenRef.current = {};
    const t = setInterval(() => {
      const s = stateRef.current;
      if (!s) return;
      const now = Date.now();
      for (const p of s.players) {
        if (p.id === profile.id || isBotId(p.id)) continue;
        const seen = lastSeenRef.current[p.id];
        if (seen === undefined) lastSeenRef.current[p.id] = now;
        else if (now - seen > GONE_MS) {
          delete lastSeenRef.current[p.id];
          applyLocal({ type: 'leave', playerId: p.id });
        }
      }
    }, 3000);
    return () => clearInterval(t);
  }, [isHost, connection, profile.id, applyLocal]);

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
      transport.onAction(({ action, from }) => {
        if (!isHostRef.current) return; // handed hosting to someone else
        if (from) lastSeenRef.current[from] = Date.now();
        if (action.type === 'ping') return;
        applyLocal(action);
      });
      transport.onStateRequest(() => {
        if (isHostRef.current && stateRef.current) {
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
      if (sessionSeen.size) game = reduce(game, { type: 'seen', ids: [...sessionSeen] });
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
        if (transport) {
          attachHostHandlers(transport);
          transport.onState((m) => handleStateRef.current(transport, m.state, m.sentAt));
        }
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

  /** Keep asking to join until the host's phone has us in the room. */
  const startJoinLoop = useCallback(
    (transport: RoomTransport) => {
      if (joinLoopRef.current) clearInterval(joinLoopRef.current);
      let sentSeen = false;
      const ask = () => {
        if (isHostRef.current || transportRef.current !== transport) return clearInterval(loop);
        const s = stateRef.current;
        if (s?.kicked?.includes(profile.id)) return clearInterval(loop);
        if (s?.players.some((p) => p.id === profile.id)) {
          // In the room: share the questions we've already seen this session, once.
          if (!sentSeen && sessionSeen.size) transport.sendAction({ action: { type: 'seen', ids: [...sessionSeen] }, from: profile.id });
          sentSeen = true;
          return;
        }
        transport.sendAction({ action: { type: 'join', player: me(false) }, from: profile.id });
        transport.requestState();
      };
      ask();
      const loop = setInterval(ask, 2000);
      joinLoopRef.current = loop;
    },
    [me, profile.id],
  );

  /** Become the host of `s` on this phone (host left, or went silent for too long). */
  const becomeHost = useCallback(
    (transport: RoomTransport, s: GameState) => {
      let promoted: GameState = { ...s, bank: ALL_QUESTIONS };
      if (promoted.paused) promoted = reduce(promoted, { type: 'resume', now: Date.now() });
      stateRef.current = promoted;
      isHostRef.current = true;
      lastSeenRef.current = {};
      setIsHost(true);
      setClockOffset(0);
      attachHostHandlers(transport);
      setState(promoted);
    },
    [attachHostHandlers],
  );

  /** Every state message (guests and hosts both listen). */
  const handleStateRef = useRef<(t: RoomTransport, s: GameState, sentAt: number) => void>(() => {});
  handleStateRef.current = (transport, s, sentAt) => {
    const mine = stateRef.current;
    if (mine && (s.epoch ?? 0) < (mine.epoch ?? 0)) return; // an old host that hasn't noticed yet
    if (isHostRef.current) {
      // Someone else took over while this phone was away: go back to being a guest.
      if (s.hostId !== profile.id && (s.epoch ?? 0) > (mine?.epoch ?? 0)) {
        isHostRef.current = false;
        setIsHost(false);
        lastStateAtRef.current = Date.now();
        stateRef.current = s;
        setState(s);
        startJoinLoop(transport);
      }
      return;
    }
    lastStateAtRef.current = Date.now();
    setClockOffset(sentAt - Date.now());
    // Host migration: if the host left and we're next in line, take over.
    if (s.hostId === profile.id) return becomeHost(transport, s);
    stateRef.current = s;
    setState(s);
  };

  /** Guests: if the host has been silent too long, the next player in line takes over. */
  const maybeTakeOver = (gap: number) => {
    const s = stateRef.current;
    const transport = transportRef.current;
    if (!s || !transport || isHostRef.current) return;
    const limit = s.paused ? HOST_PAUSED_GONE_MS : HOST_GONE_MS;
    if (gap < limit) return;
    const line = s.players.filter((p) => p.id !== s.hostId).sort((a, b) => a.joinOrder - b.joinOrder);
    // If the first in line is gone too, the next one takes over a little later.
    const turn = Math.min(line.length - 1, Math.floor((gap - limit) / 10_000));
    if (line[turn]?.id !== profile.id) return;
    const next = reduce({ ...s, bank: ALL_QUESTIONS }, { type: 'takeOver', newHostId: profile.id });
    becomeHost(transport, next);
  };

  const joinRoom = useCallback(
    (code: string) => {
      const { transport, connection: conn } = openTransport(code.toUpperCase());
      if (!transport) return;
      transportRef.current = transport;
      setConnection(conn);
      isHostRef.current = false;
      setIsHost(false);
      lastStateAtRef.current = Date.now();
      transport.onState((m) => handleStateRef.current(transport, m.state, m.sentAt));
      startJoinLoop(transport);
    },
    [startJoinLoop],
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
    if (joinLoopRef.current) clearInterval(joinLoopRef.current);
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
    if (mine && (mine.name !== profile.name || mine.avatar !== profile.avatar || mine.premium !== profile.premium)) {
      dispatch({
        type: 'updatePlayer',
        playerId: profile.id,
        patch: { name: profile.name, avatar: profile.avatar, premium: profile.premium },
      });
    }
  }, [profile.name, profile.avatar, profile.premium, profile.id, dispatch]);

  // Host: after handing hosting to someone else, this phone goes back to being a guest.
  useEffect(() => {
    const transport = transportRef.current;
    if (!isHost || !state || !transport || state.hostId === profile.id) return;
    if (!state.players.some((p) => p.id === profile.id)) return; // we left: leaveRoom handles it
    transport.publishState({ state: publishable(state), sentAt: Date.now() });
    isHostRef.current = false;
    setIsHost(false);
    lastStateAtRef.current = Date.now();
    startJoinLoop(transport);
  }, [isHost, state, profile.id, startJoinLoop]);

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
