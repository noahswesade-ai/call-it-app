import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimalAvatar, type Mood } from '@/avatar/AnimalAvatar';
import type { GameState } from '@/game/engine';
import type { Player } from '@/game/types';
import { useRoom } from '@/net/RoomProvider';
import { Bob, Sway } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';

/** Milliseconds left in the current timed phase, corrected for the host's clock. */
export function useTimeLeft(endsAt: number | undefined): number {
  const { clockOffset } = useRoom();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === undefined) return;
    const t = setInterval(() => setNow(Date.now()), 100);
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
  bob,
}: {
  player?: Player;
  size?: number;
  mood?: Mood;
  label?: string;
  color?: string;
  bob?: boolean;
}) {
  if (!player) return null;
  const avatar = (
    <Sway deg={size > 80 ? 4 : 6}>
      <AnimalAvatar avatar={player.avatar} size={size} mood={mood} />
    </Sway>
  );
  return (
    <View style={{ alignItems: 'center', width: size + 24 }}>
      {bob ? (
        <Bob amount={Math.max(3, size / 16)} duration={800 + (player.id.charCodeAt(0) % 5) * 120} delay={(player.id.charCodeAt(1) % 7) * 90}>
          {avatar}
        </Bob>
      ) : (
        avatar
      )}
      <Text style={[styles.name, color ? { color } : null, { fontSize: size > 90 ? 22 : 14 }]} numberOfLines={1}>
        {player.premium ? '👑 ' : ''}
        {player.name}
      </Text>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.white, fontFamily: fonts.display, textAlign: 'center' },
  label: { color: colors.gold, fontSize: 12, fontFamily: fonts.bodyBold },
});
