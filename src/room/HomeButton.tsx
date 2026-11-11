import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GameState } from '@/game/engine';
import { isBotId, useRoom } from '@/net/RoomProvider';
import { Button, tap } from '@/ui/kit';
import { PopIn } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';

/** Who would take over hosting if this host left (next in join order, still connected). */
function nextHostName(state: GameState): string | undefined {
  const line = state.players
    .filter((p) => p.id !== state.hostId && !isBotId(p.id) && p.connected !== false)
    .sort((a, b) => a.joinOrder - b.joinOrder);
  return line[0]?.name;
}

/**
 * The little 🏠 in the top-left corner of every lobby and game screen. Asks before
 * leaving. The host also gets "take everyone back to the lobby" during a game.
 */
export function HomeButton({ state }: { state: GameState }) {
  const { myId, leaveRoom, dispatch } = useRoom();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const isHost = state.hostId === myId;
  const inGame = state.phase !== 'lobby';
  const next = nextHostName(state);

  const leave = () => {
    setOpen(false);
    leaveRoom();
    router.replace('/');
  };

  return (
    <>
      <Pressable
        onPress={() => {
          tap('light');
          setOpen(true);
        }}
        style={[styles.btn, { top: insets.top + 8 }]}
        accessibilityRole="button"
        accessibilityLabel="Leave the game"
        hitSlop={8}
      >
        <Text style={styles.icon}>🏠</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.bg}>
          <PopIn>
            <View style={styles.card}>
              <Text style={styles.title}>Are you sure you want to leave?</Text>
              {isHost && (
                <Text style={styles.body}>
                  {next ? `${next} will take over as host.` : 'You are the only player here.'}
                  {inGame ? ' Or end this game and take everyone back to the lobby.' : ''}
                </Text>
              )}
              <Button variant="green" label="Stay" onPress={() => setOpen(false)} />
              {isHost && inGame && (
                <Button
                  variant="secondary"
                  label="🏠 Back to the lobby with everyone"
                  subtitle="Ends this game for the whole room"
                  onPress={() => {
                    tap('heavy');
                    setOpen(false);
                    dispatch({ type: 'backToLobby' });
                  }}
                />
              )}
              <Button variant="danger" label={isHost && next ? 'Leave (hand over hosting)' : 'Leave'} onPress={leave} />
            </View>
          </PopIn>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20,4,40,0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  icon: { fontSize: 19 },
  bg: { flex: 1, backgroundColor: 'rgba(10,0,25,0.8)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#2A0E55',
    borderColor: colors.gold,
    borderWidth: 3,
    borderRadius: 28,
    padding: 22,
    gap: 12,
    maxWidth: 420,
    width: '100%',
  },
  title: { color: colors.white, fontFamily: fonts.display, fontSize: 28, textAlign: 'center' },
  body: { color: colors.dim, fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center' },
});
