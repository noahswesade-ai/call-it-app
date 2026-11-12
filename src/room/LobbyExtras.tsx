import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { availableCategories, CATEGORIES } from '@/content/categories';
import { CategoryIcon } from '@/content/CategoryIcon';
import { randomId } from '@/game/rng';
import type { Category, Difficulty, Question, QuestionType } from '@/game/types';
import { Button, LiftRing, Segmented, tap, useLift } from '@/ui/kit';
import { PopIn, Pulse } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { CUSTOM_ONLY_MIN, lobbyIsPremium, type GameState } from '@/game/engine';
import { router } from 'expo-router';
import { useProfile } from '@/state/profile';
import { MyQuestionsList } from './MyQuestions';
import { isAllowedQuestion } from '@/content/moderation';
import { useRoom } from '@/net/RoomProvider';
import { Icon, IconLabel, type IconName } from '@/ui/Icon';

/**
 * The two big Party / Spicy switches. Always on the lobby screen (never hidden in the
 * settings) so everyone sees what Premium unlocks: locked tiles glow and lead to the
 * paywall.
 */
export function ModeTiles({
  party,
  spicy,
  locked,
  premiumLock = locked,
  interactive,
  onParty,
  onSpicy,
  onLocked,
}: {
  party: boolean;
  spicy: boolean;
  locked: boolean;
  /** Show the small lock badge (the room isn't Premium), even if a free trial game is left. */
  premiumLock?: boolean;
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
        premiumLock={premiumLock}
        interactive={interactive}
        emoji=""
        icon="beer"
        title="PARTY MODE"
        sub="Drinking challenges"
        colorsOn={['#B03A8C', '#5B2A9E']}
        onPress={() => (locked ? onLocked?.() : onParty?.(!party))}
      />
      <Tile
        on={party && spicy}
        locked={locked}
        premiumLock={premiumLock}
        interactive={interactive}
        emoji="🌶️"
        title="SPICY"
        sub="Flirty & dirty 18+"
        colorsOn={['#D8434F', '#8E1F4A']}
        onPress={() => (locked ? onLocked?.() : onSpicy?.(!(party && spicy)))}
      />
    </View>
  );
}

function Tile({
  on,
  locked,
  premiumLock,
  interactive,
  emoji,
  icon,
  title,
  sub,
  colorsOn,
  onPress,
}: {
  on: boolean;
  locked: boolean;
  premiumLock?: boolean;
  interactive: boolean;
  emoji: string;
  icon?: IconName;
  title: string;
  sub: string;
  colorsOn: [string, string];
  onPress: () => void;
}) {
  const body = (
    <View style={[styles.tile, on ? styles.tileOn : locked ? styles.tileLocked : styles.tileOff]}>
      <LinearGradient
        colors={on ? colorsOn : locked ? ['#3E1670', '#300F58'] : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']}
        style={StyleSheet.absoluteFill}
      />
      {premiumLock && (
        <View style={styles.tileLock} accessibilityLabel="Premium">
          <Icon name="lock" size={12} color={colors.ink} strokeWidth={2.8} />
        </View>
      )}
      {icon ? (
        <Icon name={icon} size={28} color={colors.white} style={{ height: 38, justifyContent: 'center' }} />
      ) : (
        <Text style={styles.tileEmoji}>{emoji}</Text>
      )}
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub}>{locked ? 'Unlock with Premium' : sub}</Text>
      <View style={[styles.tileState, on ? { backgroundColor: colors.green } : locked ? { backgroundColor: colors.gold } : null]}>
        <Text style={[styles.tileStateText, (on || locked) && { color: colors.ink }]}>{locked ? 'PREMIUM' : on ? 'ON' : 'OFF'}</Text>
      </View>
    </View>
  );
  const pulsing = locked || !on;
  const tappable = interactive || locked;
  const { scaleStyle, ringStyle, handlers } = useLift(tappable);
  return (
    <Pressable
      style={{ flex: 1 }}
      disabled={!tappable}
      {...handlers}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={title}
      onPress={() => {
        tap('medium');
        onPress();
      }}
    >
      <Animated.View style={scaleStyle}>
        <LiftRing style={ringStyle} radius={18} />
        {pulsing ? (
          <Pulse scale={1.035} duration={900}>
            {body}
          </Pulse>
        ) : (
          body
        )}
      </Animated.View>
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
  const { scaleStyle, ringStyle, handlers } = useLift();
  return (
    <>
      <Pressable
        {...handlers}
        onPress={() => {
          tap('medium');
          if (premium) setOpen(true);
          else router.push('/paywall');
        }}
        accessibilityRole="button"
        accessibilityLabel={premium ? 'Add your own questions' : 'Add your own questions (Premium)'}
      >
        <Animated.View style={scaleStyle}>
          <LiftRing style={ringStyle} radius={20} />
          <AddCard locked={!premium} count={count} />
        </Animated.View>
      </Pressable>
      <AddQuestionSheet state={state} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Examples that rotate inside the button: shows what "your own questions" feel like. */
const EXAMPLES = [
  'Who can do a better impression of our boss?',
  'What did Sam order at our first dinner together?',
  'Name everyone who has ever crashed on our couch.',
  'Who in this room cried hardest at the end of Toy Story 3?',
  'Who can recite our group chat name history fastest?',
];

function AddCard({ locked, count }: { locked: boolean; count: number }) {
  const [i, setI] = useState(0);
  const fade = useSharedValue(1);
  const sweep = useSharedValue(0);
  useEffect(() => {
    const id = setInterval(() => {
      fade.value = withSequence(withTiming(0, { duration: 250 }), withTiming(1, { duration: 350 }));
      setTimeout(() => setI((n) => (n + 1) % EXAMPLES.length), 250);
    }, 3200);
    sweep.value = withRepeat(withSequence(withTiming(0, { duration: 2400 }), withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })), -1);
    return () => clearInterval(id);
  }, [fade, sweep]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -160 + sweep.value * 720 }, { rotate: '20deg' }] }));
  return (
    <LinearGradient colors={[colors.gold, '#FF8A5C', colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBorder}>
      <View style={styles.addInner}>
        <LinearGradient colors={['rgba(255,194,61,0.22)', 'rgba(255,92,122,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View pointerEvents="none" style={[styles.addSweep, sweepStyle]} />
        <View style={styles.addTop}>
          <View style={styles.addIcon}>
            <Icon name="write" size={22} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addTitle}>Add your own questions</Text>
            <Text style={styles.addSub}>
              {count ? `${count} in this lobby · they come up first` : 'Your crew, your inside jokes. They come up first.'}
            </Text>
          </View>
          {!locked && <Text style={styles.addPlus}>＋</Text>}
        </View>
        <Animated.View style={[styles.addExample, fadeStyle]}>
          <Text style={styles.addExampleText} numberOfLines={2}>
            “{EXAMPLES[i]}”
          </Text>
        </Animated.View>
        {locked && (
          <View style={styles.addPremium}>
            <IconLabel icon="crown" textStyle={styles.addPremiumText}>Unlock with Premium</IconLabel>
          </View>
        )}
      </View>
      {locked && (
        <View style={styles.lockCorner}>
          <Icon name="lock" size={12} color={colors.ink} strokeWidth={2.6} />
        </View>
      )}
    </LinearGradient>
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

  const lobbyQs = state.custom ?? [];
  const inLobby = new Set(lobbyQs.map((q) => norm(q.prompt)));
  const mine = (profile.myQuestions ?? []).filter((q) => available.includes(q.category));
  const notYet = mine.filter((q) => !inLobby.has(norm(q.prompt)));
  const allIn = mine.length > 0 && notYet.length === 0;
  // Lobby copies of my questions that I'm allowed to take back out (mine, or any if host).
  const lobbyCopies = (qs: Question[]) => {
    const keys = new Set(qs.map((q) => norm(q.prompt)));
    return lobbyQs.filter((q) => keys.has(norm(q.prompt)) && (isHost || q.addedBy === myId)).map((q) => q.id);
  };
  const setInLobby = (qs: Question[], select: boolean) => {
    if (select) {
      const add = qs.filter((q) => !inLobby.has(norm(q.prompt)));
      if (add.length) dispatch({ type: 'addCustomMany', questions: add, by: myId });
    } else {
      const ids = lobbyCopies(qs);
      if (ids.length) dispatch({ type: 'removeCustomMany', ids, by: myId, now: Date.now() });
    }
  };
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
    dispatch({ type: 'addCustom', question, by: myId });
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
            <IconLabel icon="write" size={22} gap={8} textStyle={styles.sheetTitle}>Your own questions</IconLabel>
            <Segmented<'write' | 'mine' | 'lobby'>
              options={[
                { value: 'write', label: 'Write', icon: 'write' },
                { value: 'mine', label: `Mine (${mine.length})`, icon: 'book' },
                { value: 'lobby', label: `Lobby (${state.custom?.length ?? 0})`, icon: 'users' },
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
                      style={[styles.cat, { borderColor: category === c.id ? colors.white : colors.cardBorder, backgroundColor: category === c.id ? colors.white : 'transparent' }]}
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
                  placeholderTextColor="#8A84A6"
                  multiline
                  maxLength={240}
                  style={[styles.input, { minHeight: 70 }]}
                />
                {needsAnswer && (
                  <TextInput
                    value={answer}
                    onChangeText={setAnswer}
                    placeholder={kind === 'SPOKEN_CLOSEST' ? 'The real number, e.g. 42' : 'The answer (only the host sees it)'}
                    placeholderTextColor="#8A84A6"
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
                  {isHost ? 'Everything the room has added. Tap 🗑️ to remove a question.' : 'Everything the room has added. You can remove the ones you added; the host can remove any.'}
                </Text>
                {(state.custom ?? []).length === 0 ? (
                  <Text style={styles.hint}>No questions yet. Be the first!</Text>
                ) : (
                  (state.custom ?? []).map((q) => (
                    <View key={q.id} style={styles.lobbyRow}>
                      <CategoryIcon category={q.category} size={16} />
                      <Text style={styles.lobbyPrompt}>{q.prompt}</Text>
                      {(isHost || q.addedBy === myId) && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove this question from the lobby"
                          onPress={() => {
                            tap('medium');
                            dispatch({ type: 'removeCustom', id: q.id, by: myId, now: Date.now() });
                          }}
                        >
                          <Icon name="trash" size={18} color={colors.dim} />
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
                  <>
                    <View style={styles.selectRow}>
                      <Text style={[styles.hint, { flex: 1 }]}>
                        {mine.length - notYet.length} of {mine.length} in this lobby. Tap a question to add or remove it.
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        style={styles.selectAll}
                        onPress={() => {
                          tap('medium');
                          setInLobby(mine, !allIn);
                        }}
                      >
                        <Text style={styles.selectAllText}>{allIn ? 'Unselect all' : 'Select all'}</Text>
                      </Pressable>
                    </View>
                    <MyQuestionsList questions={mine} isSelected={(q) => inLobby.has(norm(q.prompt))} onToggle={(q, on) => setInLobby([q], on)} />
                  </>
                )}
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
  tile: { borderRadius: 18, overflow: 'hidden', paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 2, borderWidth: 1.5, minHeight: 124 },
  tileOn: { borderColor: 'rgba(255,255,255,0.3)', shadowColor: colors.neon, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  tileOff: { borderColor: colors.cardBorder },
  tileLocked: { borderColor: 'rgba(255,194,61,0.6)', shadowColor: colors.gold, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  tileEmoji: { fontSize: 30 },
  tileLock: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 17, textAlign: 'center', letterSpacing: -0.2 },
  tileSub: { color: '#E2D8F2', fontFamily: fonts.bodySemi, fontSize: 12, textAlign: 'center' },
  tileState: { marginTop: 4, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  tileStateText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8 },
  sheetBg: { flex: 1, backgroundColor: 'rgba(5,3,12,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '92%', maxWidth: 560, width: '100%', alignSelf: 'center' },
  sheetTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.4 },
  label: { color: colors.dim, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  hint: { color: colors.dim, fontFamily: fonts.body, fontSize: 13 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cat: { borderWidth: 1.5, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  catText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 13 },
  input: { backgroundColor: colors.white, borderRadius: 14, padding: 12, fontSize: 17, fontFamily: fonts.bodySemi, color: colors.ink },
  addBorder: { borderRadius: 20, padding: 1.5 },
  addInner: { borderRadius: 19, backgroundColor: '#341059', padding: 14, gap: 10, overflow: 'hidden' },
  addSweep: { position: 'absolute', top: -40, bottom: -40, width: 60, backgroundColor: 'rgba(255,255,255,0.10)' },
  addTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,194,61,0.18)', alignItems: 'center', justifyContent: 'center' },
  addTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 19, letterSpacing: -0.3 },
  addSub: { color: '#E8DDF5', fontFamily: fonts.bodySemi, fontSize: 12.5, marginTop: 1 },
  addPremium: { backgroundColor: colors.gold, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  addPremiumText: { color: colors.ink, fontFamily: fonts.display, fontSize: 15 },
  addPlus: { color: colors.gold, fontFamily: fonts.display, fontSize: 28 },
  addExample: { borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 9 },
  addExampleText: { color: colors.white, fontFamily: fonts.bodySemi, fontStyle: 'italic', fontSize: 13.5, lineHeight: 18 },
  lockCorner: {
    position: 'absolute',
    top: -8,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
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
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectAll: { borderRadius: 99, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 7 },
  selectAllText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
  added: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: 15, textAlign: 'center' },
});
