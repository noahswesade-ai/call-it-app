import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { availableCategories, CATEGORIES } from '@/content/categories';
import { CategoryIcon } from '@/content/CategoryIcon';
import { randomId } from '@/game/rng';
import type { Category, Difficulty, Question, QuestionType } from '@/game/types';
import { Button, Segmented, tap } from '@/ui/kit';
import { PopIn, Pulse } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { CUSTOM_ONLY_MIN, lobbyIsPremium, type GameState } from '@/game/engine';
import { router } from 'expo-router';
import { useProfile } from '@/state/profile';
import { MyQuestionsList } from './MyQuestions';
import { isAllowedQuestion } from '@/content/moderation';
import { useRoom } from '@/net/RoomProvider';

/**
 * The two big Party / Spicy switches. Always on the lobby screen (never hidden in the
 * settings) so everyone sees what Premium unlocks: locked tiles glow and lead to the
 * paywall.
 */
export function ModeTiles({
  party,
  spicy,
  locked,
  interactive,
  onParty,
  onSpicy,
  onLocked,
}: {
  party: boolean;
  spicy: boolean;
  locked: boolean;
  interactive: boolean;
  onParty?: (v: boolean) => void;
  onSpicy?: (v: boolean) => void;
  onLocked?: () => void;
}) {
  return (
    <View style={styles.tiles}>
      <Tile
        on={party}
        locked={locked}
        interactive={interactive}
        emoji="🍻"
        title="PARTY MODE"
        sub="Drinking challenges"
        colorsOn={['#FF4FD8', '#8E2DE2']}
        onPress={() => (locked ? onLocked?.() : onParty?.(!party))}
      />
      <Tile
        on={party && spicy}
        locked={locked}
        interactive={interactive}
        emoji="🌶️"
        title="SPICY"
        sub="Flirty & dirty 18+"
        colorsOn={['#FF3B3B', '#B3125A']}
        onPress={() => (locked ? onLocked?.() : onSpicy?.(!(party && spicy)))}
      />
    </View>
  );
}

function Tile({
  on,
  locked,
  interactive,
  emoji,
  title,
  sub,
  colorsOn,
  onPress,
}: {
  on: boolean;
  locked: boolean;
  interactive: boolean;
  emoji: string;
  title: string;
  sub: string;
  colorsOn: [string, string];
  onPress: () => void;
}) {
  const body = (
    <View style={[styles.tile, on ? styles.tileOn : locked ? styles.tileLocked : styles.tileOff]}>
      <LinearGradient
        colors={on ? colorsOn : locked ? ['#3A1F5C', '#22103F'] : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)']}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.tileEmoji}>{locked ? '🔒' : emoji}</Text>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub}>{locked ? 'Unlock with Premium' : sub}</Text>
      <View style={[styles.tileState, on ? { backgroundColor: colors.green } : locked ? { backgroundColor: colors.gold } : null]}>
        <Text style={[styles.tileStateText, (on || locked) && { color: colors.ink }]}>{locked ? '👑 PREMIUM' : on ? 'ON' : 'OFF'}</Text>
      </View>
    </View>
  );
  const pulsing = locked || !on;
  return (
    <Pressable
      style={{ flex: 1 }}
      disabled={!interactive && !locked}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={title}
      onPress={() => {
        tap('medium');
        onPress();
      }}
    >
      {pulsing ? (
        <Pulse scale={1.035} duration={900}>
          {body}
        </Pulse>
      ) : (
        body
      )}
    </Pressable>
  );
}

const KINDS: { value: QuestionType; label: string; hint: string }[] = [
  { value: 'SPOKEN_EXACT', label: 'Answer', hint: 'One right answer (shout it / countdown)' },
  { value: 'SPOKEN_CLOSEST', label: 'Number', hint: 'Closest number wins' },
  { value: 'TURN_BASED', label: 'Turns', hint: 'Take turns naming things' },
  { value: 'HOST_JUDGED', label: 'Challenge', hint: 'A dare or task; the host picks the winner' },
];

/**
 * "Add your own questions": on every lobby screen. In a Premium lobby (the host has
 * Premium) it opens the sheet; otherwise it's dimmed with a lock and leads to Premium.
 */
export function AddQuestionButton({ state }: { state: GameState }) {
  const [open, setOpen] = useState(false);
  const premium = lobbyIsPremium(state);
  const count = state.custom?.length ?? 0;
  if (!premium) {
    return (
      <Pressable
        onPress={() => {
          tap('medium');
          router.push('/paywall');
        }}
        accessibilityRole="button"
        accessibilityLabel="Add your own questions (Premium)"
      >
        <View style={[styles.addBtn, styles.addLocked]}>
          <Text style={[styles.addTitle, { opacity: 0.6 }]}>✍️ Add your own questions</Text>
          <Text style={[styles.addSub, { opacity: 0.6 }]}>Inside jokes, your friends, your rules</Text>
          <View style={styles.lockCorner}>
            <Text style={{ fontSize: 13 }}>🔒</Text>
          </View>
        </View>
      </Pressable>
    );
  }
  return (
    <>
      <Pulse scale={1.02} duration={900}>
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Add your own questions">
          <View style={styles.addBtn}>
            <Text style={styles.addTitle}>✍️ Add your own questions</Text>
            <Text style={styles.addSub}>{count ? `${count} in this lobby · they come up much more often` : 'Inside jokes, your friends, your rules'}</Text>
          </View>
        </Pressable>
      </Pulse>
      <AddQuestionSheet state={state} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const norm = (p: string) => p.trim().toLowerCase().replace(/\s+/g, ' ');

function AddQuestionSheet({ state, visible, onClose }: { state: GameState; visible: boolean; onClose: () => void }) {
  const { dispatch, myId } = useRoom();
  const { profile, saveQuestions } = useProfile();
  const [tab, setTab] = useState<'write' | 'mine' | 'lobby'>('write');
  const [blocked, setBlocked] = useState(false);
  const isHost = state.hostId === myId;
  const available = availableCategories(state.settings.mode, state.settings.spicy);
  const cats = CATEGORIES.filter((c) => available.includes(c.id));
  const [category, setCategory] = useState<Category>(cats[0]?.id ?? 'basic');
  const [kind, setKind] = useState<QuestionType>('SPOKEN_EXACT');
  const [difficulty, setDifficulty] = useState<Difficulty>('M');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [added, setAdded] = useState(0);
  const needsAnswer = kind === 'SPOKEN_EXACT' || kind === 'SPOKEN_CLOSEST';
  const numeric = Number(answer.replace(/[^0-9.\-]/g, ''));
  const valid = prompt.trim().length > 4 && (!needsAnswer || answer.trim().length > 0) && (kind !== 'SPOKEN_CLOSEST' || Number.isFinite(numeric));

  const inLobby = new Set((state.custom ?? []).map((q) => norm(q.prompt)));
  const mine = (profile.myQuestions ?? []).filter((q) => available.includes(q.category));
  const notYet = mine.filter((q) => !inLobby.has(norm(q.prompt)));
  const hiddenCount = (profile.myQuestions ?? []).length - mine.length;

  const submit = () => {
    if (!valid) return;
    if (!isAllowedQuestion(`${prompt} ${answer}`)) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    const question: Question = {
      id: `custom-${myId.slice(0, 6)}-${randomId()}`,
      category,
      type: kind,
      difficulty,
      prompt: prompt.trim(),
      answer: needsAnswer ? answer.trim() : undefined,
      numericAnswer: kind === 'SPOKEN_CLOSEST' ? numeric : undefined,
      custom: true,
    };
    dispatch({ type: 'addCustom', question });
    // Every question you write is also kept in "My questions" for future lobbies.
    saveQuestions([question]);
    tap('heavy');
    setPrompt('');
    setAnswer('');
    setAdded((n) => n + 1);
  };

  const lobbyCounts = cats
    .filter((c) => state.settings.categories.includes(c.id))
    .map((c) => ({ c, n: (state.custom ?? []).filter((q) => q.category === c.id).length }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBg}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={{ gap: 10 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle}>✍️ Your own questions</Text>
            <Segmented<'write' | 'mine' | 'lobby'>
              options={[
                { value: 'write', label: '✍️ Write' },
                { value: 'mine', label: `📚 Mine (${mine.length})` },
                { value: 'lobby', label: `🏠 Lobby (${state.custom?.length ?? 0})` },
              ]}
              value={tab}
              onChange={setTab}
            />
            <View style={styles.countRow}>
              {lobbyCounts.map(({ c, n }) => (
                <View key={c.id} style={[styles.countChip, n >= CUSTOM_ONLY_MIN && { borderColor: colors.green }]}>
                  <CategoryIcon category={c.id} size={14} />
                  <Text style={styles.countText}>{n}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.hint}>In this lobby, by category. Your questions come up far more often than ours.</Text>

            {tab === 'write' ? (
              <>
                <Text style={styles.label}>Category</Text>
                <View style={styles.cats}>
                  {cats.map((c) => (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: category === c.id }}
                      onPress={() => setCategory(c.id)}
                      style={[styles.cat, { borderColor: c.color, backgroundColor: category === c.id ? c.color : 'transparent' }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <CategoryIcon category={c.id} size={18} />
                        <Text style={[styles.catText, category === c.id && { color: colors.ink }]}>{c.label}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.label}>Type</Text>
                <Segmented<QuestionType> options={KINDS.map((k) => ({ value: k.value, label: k.label }))} value={kind} onChange={setKind} />
                <Text style={styles.hint}>{KINDS.find((k) => k.value === kind)?.hint}</Text>
                <Text style={styles.label}>Difficulty</Text>
                <Segmented<Difficulty>
                  options={[
                    { value: 'E', label: 'Easy' },
                    { value: 'M', label: 'Medium' },
                    { value: 'H', label: 'Hard' },
                  ]}
                  value={difficulty}
                  onChange={setDifficulty}
                />
                <TextInput
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder={kind === 'HOST_JUDGED' ? 'e.g. Who can do the best moonwalk?' : kind === 'TURN_BASED' ? 'e.g. Name songs by Drake.' : 'e.g. Where did we go on our first group trip?'}
                  placeholderTextColor="#8E7CC3"
                  multiline
                  maxLength={240}
                  style={[styles.input, { minHeight: 70 }]}
                />
                {needsAnswer && (
                  <TextInput
                    value={answer}
                    onChangeText={setAnswer}
                    placeholder={kind === 'SPOKEN_CLOSEST' ? 'The real number, e.g. 42' : 'The answer (only the host sees it)'}
                    placeholderTextColor="#8E7CC3"
                    keyboardType={kind === 'SPOKEN_CLOSEST' ? 'numeric' : 'default'}
                    style={styles.input}
                  />
                )}
                <Text style={styles.hint}>
                  Keep it fun for everyone: no questions that bully someone or sexually target a real person.
                </Text>
                {blocked && <Text style={styles.blocked}>That question contains words we don't allow. Please reword it.</Text>}
                {added > 0 && (
                  <PopIn key={added}>
                    <Text style={styles.added}>✅ Added to this lobby and saved to My questions</Text>
                  </PopIn>
                )}
                <Button label="Add question" variant="green" disabled={!valid} onPress={submit} />
              </>
            ) : tab === 'lobby' ? (
              <>
                <Text style={styles.hint}>
                  {isHost ? 'Everything the room has added. Tap 🗑️ to remove a question.' : 'Everything the room has added. The host can remove questions.'}
                </Text>
                {(state.custom ?? []).length === 0 ? (
                  <Text style={styles.hint}>No questions yet. Be the first!</Text>
                ) : (
                  (state.custom ?? []).map((q) => (
                    <View key={q.id} style={styles.lobbyRow}>
                      <CategoryIcon category={q.category} size={16} />
                      <Text style={styles.lobbyPrompt}>{q.prompt}</Text>
                      {isHost && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove this question from the lobby"
                          onPress={() => {
                            tap('medium');
                            dispatch({ type: 'removeCustom', id: q.id, by: myId, now: Date.now() });
                          }}
                        >
                          <Text style={{ fontSize: 18 }}>🗑️</Text>
                        </Pressable>
                      )}
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                {mine.length === 0 ? (
                  <Text style={styles.hint}>
                    Nothing here yet. Every question you write in any lobby is saved here, so you can bring it to your next game in one tap.
                  </Text>
                ) : (
                  <Button
                    variant="green"
                    label={notYet.length ? `➕ Add all (${notYet.length})` : '✅ All added'}
                    disabled={notYet.length === 0}
                    onPress={() => {
                      tap('heavy');
                      dispatch({ type: 'addCustomMany', questions: notYet });
                    }}
                  />
                )}
                <MyQuestionsList
                  questions={mine}
                  isAdded={(q) => inLobby.has(norm(q.prompt))}
                  onAdd={(q) => {
                    tap('medium');
                    dispatch({ type: 'addCustom', question: q });
                  }}
                />
                {hiddenCount > 0 && <Text style={styles.hint}>{hiddenCount} more of yours are for Party/Spicy and don't fit this lobby's mode.</Text>}
              </>
            )}
            <Button label="Done" variant="ghost" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { borderRadius: 20, overflow: 'hidden', paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 2, borderWidth: 3, minHeight: 132 },
  tileOn: { borderColor: '#FFF3', shadowColor: colors.neon, shadowOpacity: 0.9, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  tileOff: { borderColor: 'rgba(255,255,255,0.25)', borderStyle: 'dashed' },
  tileLocked: { borderColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  tileEmoji: { fontSize: 34 },
  tileTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 19, textAlign: 'center' },
  tileSub: { color: '#F2E6FF', fontFamily: fonts.bodySemi, fontSize: 12, textAlign: 'center' },
  tileState: { marginTop: 4, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  tileStateText: { color: colors.white, fontFamily: fonts.display, fontSize: 12, letterSpacing: 1 },
  sheetBg: { flex: 1, backgroundColor: 'rgba(10,0,25,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#2A0E55', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '92%', maxWidth: 560, width: '100%', alignSelf: 'center' },
  sheetTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 26 },
  label: { color: colors.gold, fontFamily: fonts.display, fontSize: 14, letterSpacing: 1 },
  hint: { color: colors.dim, fontFamily: fonts.body, fontSize: 13 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cat: { borderWidth: 2, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  catText: { color: colors.white, fontFamily: fonts.display, fontSize: 13 },
  input: { backgroundColor: colors.white, borderRadius: 14, padding: 12, fontSize: 17, fontFamily: fonts.bodySemi, color: colors.ink },
  addBtn: {
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: 'rgba(255,201,60,0.14)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  addLocked: { borderColor: 'rgba(255,201,60,0.45)', backgroundColor: 'rgba(0,0,0,0.35)' },
  addTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 20 },
  addSub: { color: colors.dim, fontFamily: fonts.bodySemi, fontSize: 13, marginTop: 2 },
  lockCorner: {
    position: 'absolute',
    top: -8,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blocked: { color: colors.red, fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center' },
  lobbyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 8 },
  lobbyPrompt: { flex: 1, color: colors.white, fontFamily: fonts.bodySemi, fontSize: 14 },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  countText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
  added: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: 15, textAlign: 'center' },
});
