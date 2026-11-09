import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useRoom } from '@/net/RoomProvider';
import { Lobby } from '@/room/Lobby';
import { BetsReveal, Betting, Challenge, Matchup, Result, Spin } from '@/room/Phases';
import { Podium } from '@/room/Podium';
import { Body, Button, Dim, H1, Screen } from '@/ui/kit';

/** One screen for the whole game; it shows whatever phase the host's state is in. */
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
      <Screen style={{ justifyContent: 'center' }}>
        <H1 style={{ textAlign: 'center' }}>Joining…</H1>
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

  return (
    <Screen scroll style={{ flexGrow: 1 }}>
      {content}
    </Screen>
  );
}
