import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deviceInfo, flushBugReports, sendBugReport } from '@/net/bugReports';
import { useRoom } from '@/net/RoomProvider';
import { useProfile } from '@/state/profile';
import { Icon } from './Icon';
import { Button, tap } from './kit';
import { colors, fonts } from './theme';

/**
 * A small warning triangle in the bottom-right corner of every screen. Tapping it opens
 * "Report bug": type what went wrong and send. The report includes where it happened
 * (screen, room, phase, round), the player's name, the time and the device.
 */
export function BugReportButton() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'saved'>('idle');
  const path = usePathname();
  const { state, myId, isHost } = useRoom();
  const { profile } = useProfile();
  useEffect(() => {
    void flushBugReports();
  }, []);

  const context = [
    `screen ${path}`,
    state ? `room ${state.code}` : null,
    state ? `phase ${state.phase}` : null,
    state?.round ? `round ${state.round.number}` : null,
    state?.round ? `question ${state.round.question.id}` : null,
    state ? (isHost ? 'host' : state.round?.judgeId === myId ? 'judging' : 'guest') : null,
    state ? `${state.players.length} players` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const send = async () => {
    if (!text.trim()) return;
    setStatus('sending');
    const ok = await sendBugReport({ text: text.trim(), context, name: profile.name, at: new Date().toISOString(), device: deviceInfo() });
    setStatus(ok ? 'sent' : 'saved');
    setText('');
    setTimeout(() => {
      setOpen(false);
      setStatus('idle');
    }, 1400);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          tap();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Report a bug"
        hitSlop={8}
        style={[styles.fab, { bottom: insets.bottom + 6 }]}
      >
        <Icon name="warning" size={15} color={colors.gold} strokeWidth={2.4} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.bg}>
          <View style={styles.card}>
            <View style={styles.head}>
              <Icon name="warning" size={20} color={colors.gold} />
              <Text style={styles.title}>Report bug</Text>
            </View>
            {status === 'sent' || status === 'saved' ? (
              <Text style={styles.thanks}>
                {status === 'sent' ? 'Thanks! Your report was sent.' : 'Thanks! Saved on this phone; it will be sent automatically.'}
              </Text>
            ) : (
              <>
                <Text style={styles.sub}>What went wrong? What did you expect to happen?</Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Describe the bug…"
                  placeholderTextColor="#8A84A6"
                  multiline
                  autoFocus
                  maxLength={1000}
                  style={styles.input}
                />
                <Text style={styles.small}>We also send the screen you're on and your game's round, to help us find it.</Text>
                <Button label="Send report" icon="share" disabled={!text.trim()} loading={status === 'sending'} onPress={send} />
                <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 6 }}>
                  <Text style={styles.cancel}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(23,5,48,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,194,61,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  bg: { flex: 1, backgroundColor: 'rgba(5,2,14,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.white, fontFamily: fonts.display, fontSize: 22 },
  sub: { color: colors.dim, fontFamily: fonts.bodySemi, fontSize: 14 },
  input: { backgroundColor: colors.white, borderRadius: 12, padding: 12, minHeight: 110, textAlignVertical: 'top', fontSize: 16, fontFamily: fonts.bodySemi, color: colors.ink },
  small: { color: colors.dim, fontFamily: fonts.body, fontSize: 12 },
  cancel: { color: colors.dim, fontFamily: fonts.bodyBold, fontSize: 15 },
  thanks: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: 16, paddingVertical: 12 },
});
