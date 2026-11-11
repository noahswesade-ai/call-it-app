import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import Animated, { ZoomIn, SlideInRight, FadeIn } from 'react-native-reanimated';
import { useRoom } from '@/net/RoomProvider';
import { useProfile } from '@/state/profile';
import { Lobby } from '@/room/Lobby';
import { BetsReveal, Betting, Challenge, Matchup, Result, Spin, UnderdogOverlay, myResultTint } from '@/room/Phases';
import { Podium } from '@/room/Podium';
import { TimerBar } from '@/room/TimerBar';
import { ContinuePrompt, ContinueTapArea, waitsForHost } from '@/room/Continue';
import { actingHostId, host as hostOf } from '@/game/engine';
import { preloadSounds } from '@/ui/sound';
import { HomeButton } from '@/room/HomeButton';

const playerName = (s: { players: { id: string; name: string }[] }, id: string) => s.players.find((p) => p.id === id)?.name ?? 'the host';
import { View, Text } from 'react-native';
import { Pulse } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { canJoin, isFinalRound, phaseDuration } from '@/game/engine';
import { Body, Button, Dim, H1, Screen } from '@/ui/kit';
import { Bob } from '@/ui/motion';

/** One screen for the whole game; each phase animates in as the host's state changes. */
export default function Room() {
  const { state, myId, leaveRoom, joinRoom, isHost, dispatch, hostAway } = useRoom();
  const [waitedLong, setWaitedLong] = useState(false);
  // The room code lives in the address (…/room?code=ABCD), so a copied address works
  // as an invite and a reloaded page reconnects to the same room (a host who reloads
  // is recognised as host again).
  const params = useLocalSearchParams<{ code?: string }>();
  const code = (params.code ?? '').toUpperCase();
  const autoJoined = useRef(false);
  const { loaded } = useProfile();
  useEffect(() => {
    // Wait for this phone's saved profile so we join as ourselves, not a temporary id.
    if (loaded && !state && /^[A-Z]{4}$/.test(code) && !autoJoined.current) {
      autoJoined.current = true;
      joinRoom(code);
    }
  }, [loaded, state, code, joinRoom]);

  useEffect(() => {
    if (state) preloadSounds();
  }, [!!state]);

  useEffect(() => {
    const t = setTimeout(() => setWaitedLong(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const back = () => {
    leaveRoom();
    router.replace('/');
  };

  if (!state) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Bob amount={10} duration={500}>
          <H1>Joining…</H1>
        </Bob>
        {waitedLong && <Dim style={{ textAlign: 'center' }}>Can't find that room. Check the code and that the host has the lobby open.</Dim>}
        <Button label="Back" variant="ghost" onPress={back} />
      </Screen>
    );
  }

  if (state.kicked?.includes(myId)) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <H1 style={{ textAlign: 'center' }}>You were removed</H1>
        <Body style={{ textAlign: 'center' }}>The host removed you from this lobby.</Body>
        <Button label="Back to home" onPress={back} />
      </Screen>
    );
  }

  const inRoom = state.players.some((p) => p.id === myId);
  if (!inRoom && state.phase === 'lobby' && waitedLong && !canJoin(state)) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <H1 style={{ textAlign: 'center' }}>Room is full</H1>
        <Body style={{ textAlign: 'center' }}>Free rooms hold up to 10 players. Ask the host about Premium for unlimited players.</Body>
        <Button label="Back" onPress={back} />
      </Screen>
    );
  }

  const content = (() => {
    switch (state.phase) {
      case 'lobby':
        return <Lobby state={state} />;
      case 'matchup':
        return <Matchup state={state} />;
      case 'spin':
        return <Spin state={state} />;
      case 'betting':
        return <Betting state={state} />;
      case 'betsReveal':
        return <BetsReveal state={state} />;
      case 'challenge':
        return <Challenge state={state} />;
      case 'result':
        return <Result state={state} />;
      case 'podium':
        return <Podium state={state} />;
    }
  })();

  const tint =
    state.phase === 'matchup' && isFinalRound(state)
      ? 'fire'
      : state.phase === 'result'
      ? myResultTint(state, myId)
      : state.settings.mode === 'party' && (state.phase === 'lobby' || state.phase === 'podium')
        ? state.settings.spicy
          ? 'spicy'
          : 'party'
        : undefined;
  const entering =
    state.phase === 'matchup' ? ZoomIn.duration(350) : state.phase === 'lobby' ? FadeIn.duration(300) : SlideInRight.duration(320);

  return (
    <Screen
      scroll
      style={{ flexGrow: 1 }}
      tint={tint}
      overlay={
        <>
          {state.phase === 'betsReveal' && <UnderdogOverlay key={state.round?.number} state={state} />}
          {actingHostId(state) === myId && waitsForHost(state) && <ContinueTapArea state={state} onContinue={() => dispatch({ type: 'next', now: Date.now() })} />}
          {hostAway && <HostAway name={hostOf(state)?.name ?? 'the host'} />}
          {inRoom && <HomeButton state={state} />}
        </>
      }
      footer={
        state.phaseEndsAt !== undefined && phaseDuration(state) ? (
          <TimerBar key={`${state.phase}-${state.round?.number}`} endsAt={state.phaseEndsAt} total={phaseDuration(state)!} />
        ) : waitsForHost(state) ? (
          <ContinuePrompt state={state} isHost={actingHostId(state) === myId} hostName={playerName(state, actingHostId(state))} />
        ) : undefined
      }
    >
      <Animated.View
        key={`${state.phase}-${state.round?.number ?? 0}`}
        entering={entering}
        style={{ flexGrow: 1 }}
      >
        {content}
      </Animated.View>
    </Screen>
  );
}

/** Shown on guests' phones while the host's phone is away: the game is paused. */
function HostAway({ name }: { name: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(10,0,25,0.82)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        gap: 10,
      }}
    >
      <Pulse scale={1.1} duration={700}>
        <Text style={{ fontSize: 56 }}>⏸️</Text>
      </Pulse>
      <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 30, textAlign: 'center' }}>Game paused</Text>
      <Text style={{ color: colors.dim, fontFamily: fonts.bodySemi, fontSize: 17, textAlign: 'center' }}>
        Waiting for {name} to come back to the game…
      </Text>
      <Text style={{ color: colors.dim, fontFamily: fonts.body, fontSize: 14, textAlign: 'center', marginTop: 6 }}>
        If they don't come back soon, another player takes over as host automatically.
      </Text>
    </View>
  );
}
