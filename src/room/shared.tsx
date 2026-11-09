import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimalAvatar, type Mood } from '@/avatar/AnimalAvatar';
import type { GameState } from '@/game/engine';
import type { Player } from '@/game/types';
import { useRoom } from '@/net/RoomProvider';
import { theme } from '@/ui/kit';

/** Milliseconds left in the current timed phase, corrected for the host's clock. */
export function useTimeLeft(endsAt: number | undefined): number {
  const { clockOffset } = useRoom();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === undefined) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [endsAt]);
  if (endsAt === undefined) return 0;
  return Math.max(0, endsAt - (now + clockOffset));
}

export function playerById(state: GameState, id: string | undefined): Player | undefined {
  return state.players.find((p) => p.id === id);
}

export function PlayerBadge({
  player,
  size = 56,
  mood,
  label,
  color,
}: {
  player?: Player;
  size?: number;
  mood?: Mood;
  label?: string;
  color?: string;
}) {
  if (!player) return null;
  return (
    <View style={{ alignItems: 'center', width: size + 24 }}>
      <AnimalAvatar avatar={player.avatar} size={size} mood={mood} />
      <Text style={[styles.name, color ? { color } : null, { fontSize: size > 90 ? 20 : 13 }]} numberOfLines={1}>
        {player.premium ? '👑 ' : ''}
        {player.name}
      </Text>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  name: { color: theme.text, fontWeight: '900', textAlign: 'center' },
  label: { color: theme.dim, fontSize: 12, fontWeight: '700' },
});
