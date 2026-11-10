import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import Animated, { FadeOut, ZoomIn, SlideInRight, FadeIn } from 'react-native-reanimated';
import { useRoom } from '@/net/RoomProvider';
import { Lobby } from '@/room/Lobby';
import { BetsReveal, Betting, Challenge, Matchup, Result, Spin, myResultTint } from '@/room/Phases';
import { Podium } from '@/room/Podium';
import { TimerBar } from '@/room/TimerBar';
import { phaseDuration } from '@/game/engine';
import { Body, Button, Dim, H1, Screen } from '@/ui/kit';
import { Bob } from '@/ui/motion';

/** One screen for the whole game; each phase animates in as the host's state changes. */
export default function Room() {
  const { state, myId, leaveRoom } = useRoom();
  const [waitedLong, setWaitedLong] = useState(false);

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

  const inRoom = state.players.some((p) => p.id === myId);
  if (!inRoom && state.phase === 'lobby' && waitedLong) {
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
    state.phase === 'result'
      ? myResultTint(state, myId)
      : state.settings.mode === 'party' && (state.phase === 'lobby' || state.phase === 'podium')
        ? 'party'
        : undefined;
  const entering =
    state.phase === 'matchup' ? ZoomIn.duration(350) : state.phase === 'lobby' ? FadeIn.duration(300) : SlideInRight.duration(320);

  return (
    <Screen
      scroll
      style={{ flexGrow: 1 }}
      tint={tint}
      footer={
        state.phaseEndsAt !== undefined && phaseDuration(state) ? (
          <TimerBar key={`${state.phase}-${state.round?.number}`} endsAt={state.phaseEndsAt} total={phaseDuration(state)!} />
        ) : undefined
      }
    >
      <Animated.View
        key={`${state.phase}-${state.round?.number ?? 0}`}
        entering={entering}
        exiting={FadeOut.duration(150)}
        style={{ flexGrow: 1 }}
      >
        {content}
      </Animated.View>
    </Screen>
  );
}
