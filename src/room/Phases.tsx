import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { CATEGORY_BY_ID, DIFFICULTY_LABEL } from '@/content/categories';
import { wheelSlices } from '@/content/picker';
import { currentUnderdog, DURATIONS, host, isFinalRound, pendingBettors, rankings, type GameState } from '@/game/engine';
import type { Outcome, Pick } from '@/game/types';
import { useRoom } from '@/net/RoomProvider';
import { useCountUp } from '@/ui/Coin';
import { Confetti } from '@/ui/Confetti';
import { Button, Dim, Pill, Row, tap } from '@/ui/kit';
import { Bob, PopIn, Pulse, Shake, SlideIn, Sway, Wobble } from '@/ui/motion';
import { A_COLOR, A_LIP, B_COLOR, B_LIP, colors, fonts } from '@/ui/theme';
import { CountdownRing, DangerVignette, EmojiRain, GrowBar, Slam, Sunburst } from './fx';
import { PlayerBadge, playerById, useTimeLeft } from './shared';
import { Wheel } from './Wheel';
import { CategoryIcon } from '@/content/CategoryIcon';
import { UnderdogAlert, UnderdogTag, UnderdogVictory } from './Underdog';
import { bounce } from '@/ui/motion';

function RoundHeader({ state }: { state: GameState }) {
  const r = state.round!;
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Pill label={`ROUND ${r.number} / ${state.settings.rounds}`} color="rgba(20,4,40,0.55)" />
      {isFinalRound(state) && (
        <Pulse scale={1.08} duration={450}>
          <Pill label="🔥 FINAL ROUND · ×2" color={colors.red} />
        </Pulse>
      )}
    </Row>
  );
}

function CategoryLine({ state }: { state: GameState }) {
  const r = state.round!;
  const c = CATEGORY_BY_ID[r.category];
  return (
    <Row style={{ justifyContent: 'center' }}>
      <PopIn>
        <View style={[styles.catPill, { backgroundColor: c.color }]}>
          <CategoryIcon category={r.category} size={24} />
          <Text style={styles.catPillText}>{c.label.toUpperCase()}</Text>
        </View>
      </PopIn>
      <PopIn delay={120}>
        <Pill label={DIFFICULTY_LABEL[r.question.difficulty].toUpperCase()} color="rgba(20,4,40,0.55)" />
      </PopIn>
    </Row>
  );
}

/** One challenger on a colored, tilted panel. */
function Fighter({ state, id, side, size = 120, mood }: { state: GameState; id: string; side: 'A' | 'B'; size?: number; mood?: any }) {
  const p = playerById(state, id);
  const color = side === 'A' ? A_COLOR : B_COLOR;
  return (
    <View style={[styles.fighter, { backgroundColor: color, transform: [{ rotate: side === 'A' ? '-4deg' : '4deg' }] }]}>
      <Bob amount={5} duration={700} delay={side === 'A' ? 0 : 200}>
        {p && (
          <Sway deg={4}>
            <AnimalAvatar avatar={p.avatar} size={size} mood={mood} />
          </Sway>
        )}
      </Bob>
      <Text style={styles.fighterName} numberOfLines={1}>
        {p?.premium ? '👑 ' : ''}
        {p?.name}
      </Text>
    </View>
  );
}

function VsBadge({ delay = 300 }: { delay?: number }) {
  return (
    <PopIn delay={delay} from={0}>
      <Wobble deg={8} duration={400}>
        <View style={styles.vs}>
          <Text style={styles.vsText}>VS</Text>
        </View>
      </Wobble>
    </PopIn>
  );
}

function FaceOff({ state, size = 110, moodFor }: { state: GameState; size?: number; moodFor?: (id: string) => any }) {
  const [a, b] = state.round!.challengers;
  return (
    <View style={styles.faceoff}>
      <SlideIn from="left" distance={220} style={{ flex: 1 }}>
        <Fighter state={state} id={a} side="A" size={size} mood={moodFor?.(a)} />
      </SlideIn>
      <View style={styles.vsWrap}>
        <VsBadge />
      </View>
      <SlideIn from="right" distance={220} style={{ flex: 1 }}>
        <Fighter state={state} id={b} side="B" size={size} mood={moodFor?.(b)} />
      </SlideIn>
    </View>
  );
}

export function Matchup({ state }: { state: GameState }) {
  const { myId } = useRoom();
  const r = state.round!;
  const mine = r.challengers.includes(myId);
  const final = isFinalRound(state);
  useEffect(() => {
    Haptics.notificationAsync(mine ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [mine]);
  if (final) return <FinalRoundIntro state={state} mine={mine} />;
  return (
    <View style={styles.stage}>
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 150 }}>
        <Sunburst size={420} color="rgba(255,255,255,0.07)" />
        <Slam text={`ROUND ${r.number}`} size={64} color={colors.white} />
        <SlideIn from="bottom" delay={500}>
          <Text style={styles.subHead}>of {state.settings.rounds}</Text>
        </SlideIn>
      </View>
      <FaceOff state={state} moodFor={() => 'neutral'} />
      {mine && (
        <PopIn delay={900}>
          <Pulse scale={1.1} duration={400}>
            <Text style={styles.youreUp}>⚡ YOU'RE UP! ⚡</Text>
          </Pulse>
        </PopIn>
      )}
    </View>
  );
}

/** The last round's build-up: fire, a giant 2×, and who's leading, before the face-off. */
function FinalRoundIntro({ state, mine }: { state: GameState; mine: boolean }) {
  const { myId } = useRoom();
  const party = state.settings.mode === 'party';
  const ranks = rankings(state);
  const leader = ranks[0];
  const gap = ranks.length > 1 ? leader.totals.points - ranks[1].totals.points : 0;
  useEffect(() => {
    [0, 200, 400, 1300, 1450].forEach((ms) => setTimeout(() => tap('heavy'), ms));
  }, []);
  return (
    <View style={styles.stage}>
      <EmojiRain emoji="🔥" count={18} />
      <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
        <Sunburst size={460} color="rgba(255,190,60,0.2)" />
        <Shake trigger={1} strength={10}>
          <Slam text="🔥 FINAL ROUND 🔥" size={44} color={colors.white} />
        </Shake>
        <PopIn delay={1300} from={4}>
          <Pulse scale={1.08} duration={300}>
            <View style={styles.doubleWrap}>
              <Text style={styles.double}>2×</Text>
              <Text style={styles.doubleLabel}>{party ? 'POINTS & SIPS' : 'POINTS'}</Text>
            </View>
          </Pulse>
        </PopIn>
        <SlideIn from="bottom" delay={2100}>
          <Text style={styles.finalSub}>Every point counts double. Anyone can still win!</Text>
        </SlideIn>
        {leader && leader.totals.points > 0 && (
          <SlideIn from="bottom" delay={2500}>
            <View style={styles.leaderPill}>
              <AnimalAvatar avatar={leader.player.avatar} size={30} mood="happy" />
              <Text style={styles.leaderText}>
                👑 {leader.player.name} leads by {gap} pt{gap === 1 ? '' : 's'}
              </Text>
            </View>
          </SlideIn>
        )}
      </View>
      <SlideIn from="bottom" delay={3000}>
        <FaceOff state={state} size={84} moodFor={() => 'neutral'} />
      </SlideIn>
      {mine && (
        <PopIn delay={3600}>
          <Pulse scale={1.1} duration={400}>
            <Text style={styles.youreUp}>⚡ YOU'RE UP! ⚡</Text>
          </Pulse>
        </PopIn>
      )}
    </View>
  );
}

export function Spin({ state }: { state: GameState }) {
  const r = state.round!;
  const h = host(state);
  return (
    <View style={styles.stage}>
      <RoundHeader state={state} />
      <SlideIn from="top" distance={30}>
        <Text style={styles.spinTitle}>Spinning for a challenge…</Text>
      </SlideIn>
      <Wheel
        slices={wheelSlices(state.settings.categories)}
        landOn={r.slice}
        randomResult={r.category}
        difficulty={r.question.difficulty}
        lockedSlice={state.settings.mode === 'classic' && !h?.premium}
        durationMs={DURATIONS.spin}
      />
    </View>
  );
}

/** Big tappable card for one challenger during betting. */
function PickCard({ state, id, side, onPick, chosen, disabled }: { state: GameState; id: string; side: 'A' | 'B'; onPick: () => void; chosen?: boolean; disabled?: boolean }) {
  const p = playerById(state, id);
  const press = useSharedValue(0);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * 6 }] }));
  const color = side === 'A' ? A_COLOR : B_COLOR;
  const lip = side === 'A' ? A_LIP : B_LIP;
  return (
    <Pressable
      style={{ flex: 1 }}
      disabled={disabled}
      onPressIn={() => (press.value = withTiming(1, { duration: 60 }))}
      onPressOut={() => (press.value = bounce(0))}
      onPress={onPick}
      accessibilityRole="button"
      accessibilityLabel={`Call ${p?.name}`}
    >
      <View style={[styles.pickLip, { backgroundColor: lip }]}>
        <Animated.View style={[styles.pickFace, { backgroundColor: color }, face]}>
          <Bob amount={4} duration={600} delay={side === 'A' ? 0 : 300}>
            {p && (
              <Sway deg={4}>
                <AnimalAvatar avatar={p.avatar} size={100} mood="neutral" />
              </Sway>
            )}
          </Bob>
          <Text style={styles.pickName} numberOfLines={1}>
            {p?.name}
          </Text>
          {chosen && (
            <View style={StyleSheet.absoluteFill}>
              <PopIn from={2.2} style={styles.stampWrap}>
                <Text style={styles.stamp}>CALLED IT!</Text>
              </PopIn>
            </View>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}

export function Betting({ state }: { state: GameState }) {
  const { myId, dispatch } = useRoom();
  const r = state.round!;
  const left = useTimeLeft(state.phaseEndsAt);
  const secs = Math.ceil(left / 1000);
  const pressure = left <= DURATIONS.bettingPressure;
  const canBet = r.bettors.includes(myId);
  const myBet = r.bets[myId];
  const lastSec = useRef(secs);

  useEffect(() => {
    if (pressure && canBet && !myBet && secs !== lastSec.current) {
      Haptics.impactAsync(secs <= 3 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    lastSec.current = secs;
  }, [secs, pressure, canBet, myBet]);

  const voted = r.bettors.filter((id) => id in r.bets);
  const bet = (pick: Pick) => {
    tap('heavy');
    dispatch({ type: 'bet', playerId: myId, pick, now: Date.now() });
  };
  const [a, b] = r.challengers;
  const isChallenger = r.challengers.includes(myId);
  const waitingOnMe = canBet && !myBet;

  return (
    <View style={styles.stage}>
      <DangerVignette active={pressure && waitingOnMe} />
      <RoundHeader state={state} />
      <CategoryLine state={state} />
      <View style={{ alignItems: 'center' }}>
        <Shake trigger={pressure ? secs : 0} strength={pressure ? 6 : 0}>
          <CountdownRing msLeft={left} total={DURATIONS.betting} danger={pressure} size={pressure ? 130 : 116} />
        </Shake>
      </View>
      <Text style={styles.dogHint}>🐶 Under 33% of the vote = UNDERDOG ×3</Text>

      {canBet ? (
        <>
          <SlideIn from="bottom" distance={20}>
            <Text style={styles.callIt}>{myBet ? (myBet === 'NONE' ? 'Sitting this one out…' : 'Locked in! 🔒') : 'WHO WINS? CALL IT!'}</Text>
          </SlideIn>
          <Row style={{ gap: 12, alignItems: 'stretch' }}>
            <SlideIn from="left" distance={160} style={{ flex: 1 }}>
              <PickCard state={state} id={a} side="A" onPick={() => bet('A')} chosen={myBet === 'A'} disabled={!!myBet} />
            </SlideIn>
            <SlideIn from="right" distance={160} style={{ flex: 1 }}>
              <PickCard state={state} id={b} side="B" onPick={() => bet('B')} chosen={myBet === 'B'} disabled={!!myBet} />
            </SlideIn>
          </Row>
          {!myBet && (
            <SlideIn from="bottom" delay={250}>
              <Button small variant="ghost" label={state.settings.mode === 'party' ? 'No Vote (costs 1 sip 🍺)' : 'No Vote'} onPress={() => bet('NONE')} />
            </SlideIn>
          )}
        </>
      ) : (
        <>
          <FaceOff state={state} size={92} moodFor={() => 'neutral'} />
          <Pulse scale={1.05} duration={700}>
            <Text style={styles.callIt}>{isChallenger ? '😬 The room is betting on you…' : 'Bets are coming in…'}</Text>
          </Pulse>
        </>
      )}

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={styles.votedLabel}>
          {voted.length} / {r.bettors.length} CALLED IT
        </Text>
        <Row style={{ flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
          {voted.map((id) => {
            const p = playerById(state, id);
            return p ? (
              <PopIn key={id} from={0}>
                <View style={{ alignItems: 'center', width: 56 }}>
                  <Sway>
                    <AnimalAvatar avatar={p.avatar} size={34} mood="neutral" />
                  </Sway>
                  <Text style={styles.backerName} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
              </PopIn>
            ) : null;
          })}
        </Row>
      </View>
    </View>
  );
}

function PercentLabel({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const [target, setTarget] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setTarget(pct), delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  const shown = useCountUp(target, 900);
  return <Text style={[styles.pct, { color }]}>{shown}%</Text>;
}

/** Pulsing gold ring + buzz that calls attention to the Underdog's percentage. */
function UnderdogCallout({ delay }: { delay: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setOn(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }, delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!on) return null;
  return (
    <View pointerEvents="none" style={styles.calloutWrap}>
      <Pulse scale={1.18} duration={330}>
        <View style={styles.calloutRing} />
      </Pulse>
    </View>
  );
}

/** Timing of the bets-reveal sequence: 1) votes drop in 2) percentages count up 3) the <33% callout 4) UNDERDOG takeover. */
export function revealTimeline(state: GameState) {
  const r = state.round!;
  const count = (pick: 'A' | 'B') => r.bettors.filter((id) => r.bets[id] === pick).length;
  const VOTES_AT = 300;
  const VOTE_STEP = 120;
  const PCT_AT = VOTES_AT + Math.max(count('A'), count('B')) * VOTE_STEP + 400;
  const CALLOUT_AT = PCT_AT + 1100;
  const ALERT_AT = CALLOUT_AT + 1300;
  return { VOTES_AT, VOTE_STEP, PCT_AT, CALLOUT_AT, ALERT_AT };
}

/**
 * The full-screen UNDERDOG takeover. Rendered by the room screen as an overlay above
 * everything (so it covers the whole phone screen, not just the scrolling content).
 */
export function UnderdogOverlay({ state }: { state: GameState }) {
  const r = state.round;
  const dog = currentUnderdog(state);
  if (!r || state.phase !== 'betsReveal' || !dog) return null;
  const dogPlayer = playerById(state, r.challengers[dog === 'A' ? 0 : 1]);
  if (!dogPlayer) return null;
  const backers = r.bettors.filter((id) => r.bets[id] === dog).map((id) => playerById(state, id)!).filter(Boolean);
  const total = r.bettors.filter((id) => r.bets[id] === 'A' || r.bets[id] === 'B').length;
  return (
    <UnderdogAlert
      underdog={dogPlayer}
      share={backers.length / Math.max(1, total)}
      backers={backers}
      mode={state.settings.mode}
      delay={revealTimeline(state).ALERT_AT}
    />
  );
}

export function BetsReveal({ state }: { state: GameState }) {
  const r = state.round!;
  const side = (pick: 'A' | 'B') => r.bettors.filter((id) => r.bets[id] === pick).map((id) => playerById(state, id)!).filter(Boolean);
  const none = r.bettors.filter((id) => !r.bets[id] || r.bets[id] === 'NONE').map((id) => playerById(state, id)!).filter(Boolean);
  const total = side('A').length + side('B').length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const dog = currentUnderdog(state);
  const { VOTES_AT, VOTE_STEP, PCT_AT, CALLOUT_AT } = revealTimeline(state);

  return (
    <View style={styles.stage}>
      <RoundHeader state={state} />
      <Slam text="THE ROOM HAS SPOKEN" size={34} />
      <Row style={{ alignItems: 'flex-start', gap: 10 }}>
        {(['A', 'B'] as const).map((p, i) => {
          const color = p === 'A' ? A_COLOR : B_COLOR;
          const backers = side(p);
          return (
            <View key={p} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <SlideIn from={p === 'A' ? 'left' : 'right'} distance={120}>
                <PlayerBadge player={playerById(state, r.challengers[i])} size={92} color={color} bob mood={dog === p ? 'sad' : 'neutral'} />
              </SlideIn>
              <PopIn delay={PCT_AT} from={0.3}>
                <View style={{ alignItems: 'center' }}>
                  {dog === p && <UnderdogCallout delay={CALLOUT_AT - PCT_AT} />}
                  <PercentLabel pct={pct(backers.length)} color={color} delay={PCT_AT} />
                </View>
              </PopIn>
              <GrowBar pct={pct(backers.length)} color={color} delay={PCT_AT} />
              {dog === p && (
                <PopIn delay={CALLOUT_AT + 200} from={2}>
                  <Text style={styles.under33}>⬆ UNDER 33%!</Text>
                </PopIn>
              )}
              <View style={styles.stack}>
                {backers.length === 0 && (
                  <PopIn delay={PCT_AT}>
                    <Text style={styles.noBackers}>Nobody! 😱</Text>
                  </PopIn>
                )}
                {backers.map((pl, j) => (
                  <SlideIn key={pl.id} from="top" distance={50} delay={VOTES_AT + j * VOTE_STEP}>
                    <Sway>
                      <AnimalAvatar avatar={pl.avatar} size={40} mood="neutral" />
                    </Sway>
                    <Text style={styles.backerName} numberOfLines={1}>
                      {pl.name}
                    </Text>
                  </SlideIn>
                ))}
              </View>
            </View>
          );
        })}
      </Row>
      {none.length > 0 && (
        <SlideIn from="bottom" delay={800}>
          <Dim style={{ textAlign: 'center' }}>🙈 No Vote: {none.map((p) => p.name).join(', ')}</Dim>
        </SlideIn>
      )}
    </View>
  );
}

/** The white question card flips in like a game-show card. */
function QuestionCard({ text, hint }: { text: string; hint?: string }) {
  const flip = useSharedValue(90);
  useEffect(() => {
    flip.value = bounce(0);
  }, [flip]);
  const st = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateX: `${flip.value}deg` }] }));
  return (
    <Animated.View style={[styles.qCard, st]}>
      <Text style={styles.question}>{text}</Text>
      {hint ? <Text style={styles.qHint}>{hint}</Text> : null}
    </Animated.View>
  );
}

function AnswerReveal({ answer }: { answer: string }) {
  const flip = useSharedValue(-90);
  useEffect(() => {
    flip.value = bounce(0);
    tap('heavy');
  }, [flip]);
  const st = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateY: `${flip.value}deg` }] }));
  return (
    <Animated.View style={[styles.answerCard, st]}>
      <Text style={styles.answerLabel}>ANSWER</Text>
      <Text style={styles.answer}>{answer}</Text>
    </Animated.View>
  );
}

export function Challenge({ state }: { state: GameState }) {
  const { myId, isHost, dispatch } = useRoom();
  const r = state.round!;
  const q = r.question;
  const [revealed, setRevealed] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [stallStart, setStallStart] = useState<number>();
  const stallLeft = useTimeLeft(stallStart !== undefined ? stallStart + 5000 : undefined);
  const subject = playerById(state, r.subjectId);
  // Only the host's phone ever sees the answer and the judging buttons.
  const canJudge = isHost;
  const isSubject = r.subjectId === myId;
  const prompt = q.prompt.replace(/\{S\}/g, subject?.name ?? 'them');
  const answer = q.type === 'SUBJECT_JUDGED' ? r.subjectAnswer : q.answer;
  const judgeName = playerById(state, r.judgeId)?.name ?? 'the host';
  const dog = currentUnderdog(state);
  // How-to-win rules are shown BEFORE the question so they're read first.
  const rule =
    q.type === 'SPOKEN_CLOSEST'
      ? { icon: '🔢', text: 'Both say a number out loud. Closest answer wins.' }
      : q.type === 'SPOKEN_EXACT'
        ? { icon: '🗣️', text: 'Shout the answer. First correct answer wins.' }
        : q.type === 'TURN_BASED'
          ? { icon: '🔁', text: 'Take turns answering. Repeat, stall 5s or get one wrong and you lose.' }
          : q.type === 'SUBJECT_JUDGED'
            ? { icon: '🤫', text: `${subject?.name ?? 'They'} secretly locks in the real answer. ${q.closest ? 'Closest' : 'Best'} guess wins.` }
            : undefined;

  const judge = (outcome: Outcome) => {
    tap('heavy');
    dispatch({ type: 'judge', by: myId, outcome, now: Date.now() });
  };
  const [a, b] = r.challengers;

  return (
    <View style={{ gap: 14 }}>
      <RoundHeader state={state} />
      <CategoryLine state={state} />
      <Row style={{ justifyContent: 'center', gap: 6 }}>
        <SlideIn from="left" style={{ alignItems: 'center', gap: 4 }}>
          <PlayerBadge player={playerById(state, a)} size={64} color={A_COLOR} bob mood={dog === 'A' ? 'sad' : 'neutral'} />
          {dog === 'A' && <UnderdogTag mode={state.settings.mode} />}
        </SlideIn>
        <VsBadge delay={150} />
        <SlideIn from="right" style={{ alignItems: 'center', gap: 4 }}>
          <PlayerBadge player={playerById(state, b)} size={64} color={B_COLOR} bob mood={dog === 'B' ? 'sad' : 'neutral'} />
          {dog === 'B' && <UnderdogTag mode={state.settings.mode} />}
        </SlideIn>
      </Row>
      {rule && (
        <SlideIn from="top" distance={20}>
          <View style={styles.rule}>
            <Text style={styles.ruleLabel}>HOW TO WIN</Text>
            <Text style={styles.ruleText}>
              {rule.icon} {rule.text}
            </Text>
          </View>
        </SlideIn>
      )}
      <QuestionCard text={prompt} />

      {isSubject && (
        <SlideIn from="bottom" delay={300}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>🤫 It's about you!</Text>
            {r.subjectAnswer ? (
              <Text style={styles.panelBody}>Your secret answer: {r.subjectAnswer}. You judge who got closest!</Text>
            ) : (
              <>
                <Text style={styles.panelBody}>Type the real answer secretly before they guess.</Text>
                <TextInput value={subjectDraft} onChangeText={setSubjectDraft} placeholder="Your real answer" placeholderTextColor="#8E7CC3" style={styles.input} />
                <Button
                  label="🔒 Lock it in"
                  disabled={!subjectDraft.trim()}
                  onPress={() => dispatch({ type: 'subjectAnswer', playerId: myId, answer: subjectDraft.trim() })}
                />
              </>
            )}
          </View>
        </SlideIn>
      )}

      {r.answerShownToAll && answer && !canJudge && <AnswerReveal answer={answer} />}

      {canJudge ? (
        <SlideIn from="bottom" delay={350}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>⚖️ You’re the judge</Text>
            {(answer !== undefined || q.answer) &&
              (revealed ? (
                <>
                  <AnswerReveal answer={answer ?? '—'} />
                  {!r.answerShownToAll && <Button small variant="secondary" label="📣 Show on everyone's screen" onPress={() => dispatch({ type: 'showAnswerToAll' })} />}
                </>
              ) : (
                <Pulse scale={1.03} duration={800}>
                  <Button
                    variant="secondary"
                    label="👁️ Reveal answer"
                    subtitle="Only you can see it"
                    disabled={q.type === 'SUBJECT_JUDGED' && !r.subjectAnswer}
                    onPress={() => setRevealed(true)}
                  />
                </Pulse>
              ))}
            {q.type === 'SUBJECT_JUDGED' && !r.subjectAnswer && <Dim>Waiting for {subject?.name} to lock in their answer…</Dim>}
            {q.type === 'TURN_BASED' && (
              <Button
                small
                variant="ghost"
                label={stallStart !== undefined && stallLeft > 0 ? `⏱️ ${Math.ceil(stallLeft / 1000)}…` : '⏱️ Start 5s stall timer'}
                onPress={() => setStallStart(Date.now())}
              />
            )}
            <Text style={styles.whoWon}>WHO WON?</Text>
            <Row>
              <Button style={{ flex: 1 }} variant="a" label={playerById(state, a)?.name ?? 'A'} onPress={() => judge('A')} />
              <Button style={{ flex: 1 }} variant="b" label={playerById(state, b)?.name ?? 'B'} onPress={() => judge('B')} />
            </Row>
            <Button small variant="ghost" label="🤝 Draw" onPress={() => judge('DRAW')} />
          </View>
        </SlideIn>
      ) : (
        <Pulse scale={1.04} duration={800}>
          <Text style={styles.waitText}>⚖️ {judgeName} is judging…</Text>
        </Pulse>
      )}

      {isHost && (
        <Row style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Button small variant="ghost" label="Skip round" onPress={() => dispatch({ type: 'skipRound', now: Date.now() })} />
          <Button small variant="ghost" label={`Swap ${playerById(state, a)?.name}`} onPress={() => dispatch({ type: 'swapChallenger', out: a, now: Date.now() })} />
          <Button small variant="ghost" label={`Swap ${playerById(state, b)?.name}`} onPress={() => dispatch({ type: 'swapChallenger', out: b, now: Date.now() })} />
        </Row>
      )}
    </View>
  );
}

/** "+1" that pops in beside a supporter, then floats gently. */
function PlusPoints({ points, delay }: { points: number; delay: number }) {
  useEffect(() => {
    const t = setTimeout(() => tap('light'), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <PopIn delay={delay} from={2.4}>
      <Bob amount={3} duration={500} delay={delay}>
        <View style={[styles.plus, points >= 3 && styles.plusBig]}>
          <Text style={styles.plusText}>+{points}</Text>
        </View>
      </Bob>
    </PopIn>
  );
}

/** Per-player result kind, used to tint the whole screen. */
export function myResultTint(state: GameState, myId: string): 'green' | 'red' | undefined {
  const s = state.round?.score?.perPlayer[myId];
  if (!s) return undefined;
  if (s.points > 0) return 'green';
  if (s.result === 'draw') return undefined;
  // Wrong call, losing challenger or No Vote: red in both modes.
  return 'red';
}

function Standings({ state, delay = 500 }: { state: GameState; delay?: number }) {
  const rows = rankings(state).slice(0, 4);
  const max = Math.max(1, ...rows.map((r) => r.totals.points));
  const lastRound = state.round?.score?.perPlayer ?? {};
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>📊 Standings</Text>
      {rows.map((r, i) => (
        <SlideIn key={r.player.id} from="right" delay={delay + i * 110} distance={80}>
          <Row style={{ gap: 8 }}>
            <Text style={styles.rankNum}>{r.rank}</Text>
            <AnimalAvatar avatar={r.player.avatar} size={26} mood={i === 0 ? 'happy' : undefined} />
            <View style={{ flex: 1, gap: 3 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {i === 0 && r.totals.points > 0 ? '👑 ' : ''}
                  {r.player.name}
                </Text>
                <Text style={styles.rowVal}>
                  {r.totals.points} pts
                  {lastRound[r.player.id]?.points ? <Text style={{ color: colors.green }}>  +{lastRound[r.player.id].points}</Text> : null}
                </Text>
              </Row>
              <GrowBar pct={(r.totals.points / max) * 100} color={i === 0 ? colors.gold : colors.violet} height={8} delay={delay + 100 + i * 110} />
            </View>
          </Row>
        </SlideIn>
      ))}
    </View>
  );
}

export function Result({ state }: { state: GameState }) {
  const { myId, isHost, dispatch } = useRoom();
  const r = state.round!;
  const score = r.score!;
  const mine = score.perPlayer[myId];
  const party = state.settings.mode === 'party';
  const winnerId = r.outcome === 'A' ? r.challengers[0] : r.outcome === 'B' ? r.challengers[1] : undefined;
  const me = playerById(state, myId);
  const left = useTimeLeft(state.phaseEndsAt);

  useEffect(() => {
    if (!mine) return;
    Haptics.notificationAsync(mine.points > 0 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [mine]);

  let headline = '';
  let sub = '';
  let kind: 'win' | 'drink' | 'loss' | 'neutral' = 'neutral';
  if (!mine) {
    headline = r.outcome === 'DRAW' ? "IT'S A DRAW!" : `${playerById(state, winnerId)?.name} WINS!`;
  } else if (mine.points > 0) {
    kind = 'win';
    headline = `+${mine.points}`;
    sub = mine.result === 'betWin' && score.multiplier > 1 ? `🐶 Underdog bonus ×${score.multiplier}!` : '';
  } else if (party && (mine.sips > 0 || mine.shot)) {
    kind = 'drink';
    headline = mine.shot ? 'SHOT!' : `DRINK ${mine.sips}`;
    sub =
      mine.result === 'noVote'
        ? 'That’s the No Vote tax 🍺'
        : mine.result === 'draw'
          ? 'Draws mean both challengers drink'
          : mine.result === 'betLoss' && score.multiplier > 1
            ? `🐶 The Underdog won · sips ×${score.multiplier}! 😱`
            : 'Bottoms up!';
  } else {
    kind = 'loss';
    headline = mine.result === 'noVote' ? 'NO VOTE' : mine.result === 'draw' ? 'DRAW' : 'MISSED IT';
    sub = mine.result === 'draw' ? 'Nobody scores on a draw' : 'Better luck next round!';
    if (mine.result === 'draw') kind = 'neutral';
  }

  const winner = playerById(state, winnerId);
  const supporters = winnerId
    ? r.bettors.filter((id) => score.perPlayer[id]?.result === 'betWin').map((id) => playerById(state, id)!).filter(Boolean)
    : [];
  // Timeline: winner → supporters one by one → their +points → your result → the rest.
  const SUP_START = 1900;
  const SUP_STEP = 260;
  const plusAt = SUP_START + supporters.length * SUP_STEP + 250;
  const youAt = plusAt + supporters.length * 160 + 400;

  return (
    <View style={{ gap: 14 }}>
      {winner && <Confetti count={70} />}
      {kind === 'drink' && <EmojiRain emoji={mine?.shot ? '🥃' : '🍺'} count={16} />}
      <RoundHeader state={state} />

      {/* 1. The winner, front and centre */}
      <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
        <Sunburst size={400} color="rgba(255,255,255,0.13)" />
        {winner ? (
          <>
            <PopIn from={0.1}>
              <Bob amount={9} duration={380}>
                <Sway deg={5}>
                  <AnimalAvatar avatar={winner.avatar} size={104} mood="happy" />
                </Sway>
              </Bob>
            </PopIn>
            <Slam text={`${winner.name} WINS!`} size={38} color={colors.gold} delay={200} />
          </>
        ) : (
          <>
            <Row style={{ justifyContent: 'center' }}>
              {r.challengers.map((id, i) => (
                <PopIn key={id} delay={i * 150}>
                  <AnimalAvatar avatar={playerById(state, id)!.avatar} size={100} mood="nervous" />
                </PopIn>
              ))}
            </Row>
            <Slam text="🤝 IT'S A DRAW!" size={44} delay={200} />
          </>
        )}
      </View>

      {/* Your own result FIRST (everyone sees their reward/punishment right away): unmistakably green (right) or red (wrong) */}
      {mine && (
        <PopIn delay={winner ? 900 : 500} from={0.4}>
          <Shake trigger={kind === 'win' ? 0 : 1} strength={kind === 'win' ? 0 : 10}>
            <View style={[styles.youCard, kind === 'win' ? styles.youWin : kind === 'neutral' ? styles.youNeutral : styles.youLose]}>
              {me && (
                <Wobble deg={kind === 'drink' ? 10 : 4} duration={kind === 'drink' ? 300 : 700}>
                  <AnimalAvatar avatar={me.avatar} size={112} mood={kind === 'win' ? 'happy' : kind === 'neutral' ? 'neutral' : 'sad'} />
                </Wobble>
              )}
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={styles.youLabel}>
                  {kind === 'win'
                    ? mine.result === 'challengerWin'
                      ? '✅ YOU WON THE FACE-OFF'
                      : '✅ CORRECT CALL'
                    : mine.result === 'noVote'
                      ? '🙈 NO VOTE'
                      : mine.result === 'draw'
                        ? '🤝 DRAW'
                        : mine.result === 'challengerLoss'
                          ? '❌ YOU LOST THE FACE-OFF'
                          : '❌ WRONG CALL'}
                </Text>
                <Text style={styles.youBig}>
                  {kind === 'win'
                    ? `+${mine.points} POINT${mine.points === 1 ? '' : 'S'}`
                    : party && mine.shot
                      ? '🥃 TAKE A SHOT'
                      : party && mine.sips > 0
                        ? `🍺 DRINK ${mine.sips} SIP${mine.sips === 1 ? '' : 'S'}`
                        : '0 POINTS'}
                </Text>
                {sub ? <Text style={styles.youSub}>{sub}</Text> : null}
              </View>
            </View>
          </Shake>
        </PopIn>
      )}

      {score.multiplier > 1 && winner && <UnderdogVictory name={winner.name} mode={state.settings.mode} />}

      {/* 2. Everyone who backed the winner, one by one, then 3. their +points */}
      {winner && (
        <SlideIn from="bottom" delay={SUP_START - 250}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>🎯 Called it!</Text>
            {supporters.length === 0 ? (
              <Dim>Nobody saw that coming. 😱</Dim>
            ) : (
              <View style={styles.supGrid}>
                {supporters.map((p, i) => (
                  <PopIn key={p.id} delay={SUP_START + i * SUP_STEP} from={0.2} style={styles.supCell}>
                    <View style={styles.supporterRow}>
                      <Sway>
                        <AnimalAvatar avatar={p.avatar} size={34} mood="happy" />
                      </Sway>
                      <Text style={styles.supporterName} numberOfLines={1}>
                        {p.id === myId ? 'You' : p.name}
                      </Text>
                      <PlusPoints points={score.perPlayer[p.id].points} delay={plusAt + i * 160} />
                    </View>
                  </PopIn>
                ))}
              </View>
            )}
          </View>
        </SlideIn>
      )}

      {party && (
        <SlideIn from="bottom" delay={winner ? youAt + 300 : 600}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>🍺 Drink up</Text>
            <Row style={{ flexWrap: 'wrap', gap: 8 }}>
              {state.players
                .filter((p) => (score.perPlayer[p.id]?.sips ?? 0) > 0 || score.perPlayer[p.id]?.shot)
                .map((p, i) => (
                  <PopIn key={p.id} delay={600 + i * 90}>
                    <View style={styles.drinkChip}>
                      <AnimalAvatar avatar={p.avatar} size={28} mood="drink" />
                      <Text style={styles.drinkText}>
                        {p.name} {score.perPlayer[p.id].shot ? '🥃 shot' : `×${score.perPlayer[p.id].sips}`}
                      </Text>
                    </View>
                  </PopIn>
                ))}
            </Row>
          </View>
        </SlideIn>
      )}

      <Standings state={state} delay={winner ? youAt + 500 : 800} />

      {isHost ? (
        <Button
          variant="green"
          label={isFinalRound(state) ? '🏆 Final results' : `Next round ▶ (${Math.ceil(left / 1000)})`}
          onPress={() => dispatch({ type: 'next', now: Date.now() })}
        />
      ) : (
        <Dim style={{ textAlign: 'center' }}>Next round in {Math.ceil(left / 1000)}…</Dim>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, paddingLeft: 4, paddingRight: 12, paddingVertical: 3 },
  catPillText: { color: colors.ink, fontFamily: fonts.display, fontSize: 14 },
  stage: { gap: 16, flexGrow: 1, justifyContent: 'center' },
  subHead: { color: colors.dim, fontFamily: fonts.display, fontSize: 18, textAlign: 'center' },
  faceoff: { flexDirection: 'row', alignItems: 'center' },
  fighter: {
    alignItems: 'center',
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 7,
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  fighterName: { color: colors.white, fontFamily: fonts.display, fontSize: 22, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  vsWrap: { width: 0, alignItems: 'center', zIndex: 3 },
  vs: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold,
    borderWidth: 4,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: { color: colors.ink, fontFamily: fonts.display, fontSize: 28 },
  doubleWrap: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: colors.ink,
    borderBottomWidth: 9,
    paddingHorizontal: 26,
    paddingVertical: 4,
    marginTop: 10,
    transform: [{ rotate: '-4deg' }],
    shadowColor: colors.gold,
    shadowOpacity: 0.9,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  double: { color: colors.ink, fontFamily: fonts.display, fontSize: 84, lineHeight: 90 },
  doubleLabel: { color: colors.ink, fontFamily: fonts.display, fontSize: 22, marginTop: -6, letterSpacing: 1 },
  finalSub: { color: colors.white, fontFamily: fonts.display, fontSize: 18, textAlign: 'center', marginTop: 10 },
  leaderPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  leaderText: { color: colors.gold, fontFamily: fonts.display, fontSize: 15 },
  youreUp: { color: colors.gold, fontFamily: fonts.display, fontSize: 34, textAlign: 'center', textShadowColor: colors.ink, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
  spinTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 24, textAlign: 'center' },
  callIt: { color: colors.white, fontFamily: fonts.display, fontSize: 28, textAlign: 'center' },
  pickLip: { borderRadius: 26, paddingBottom: 7 },
  pickFace: { borderRadius: 26, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 6, overflow: 'hidden' },
  pickName: { color: colors.white, fontFamily: fonts.display, fontSize: 24, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  stampWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stamp: {
    color: colors.white,
    backgroundColor: colors.green,
    fontFamily: fonts.display,
    fontSize: 24,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: colors.ink,
    overflow: 'hidden',
    transform: [{ rotate: '-12deg' }],
  },
  dogHint: { color: colors.gold, fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center' },
  votedLabel: { color: colors.dim, fontFamily: fonts.display, fontSize: 15, letterSpacing: 1 },
  pct: { fontSize: 44, fontFamily: fonts.display },
  calloutWrap: { position: 'absolute', top: -4, left: -26, right: -26, bottom: -18, alignItems: 'center', justifyContent: 'center' },
  calloutRing: { width: 132, height: 76, borderRadius: 38, borderWidth: 5, borderColor: colors.gold, backgroundColor: 'rgba(255,201,60,0.18)' },
  under33: { color: colors.gold, fontFamily: fonts.display, fontSize: 20, textShadowColor: colors.ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  noBackers: { color: colors.dim, fontFamily: fonts.display, fontSize: 15 },
  stack: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  backerName: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 11, textAlign: 'center', maxWidth: 52 },
  rule: {
    backgroundColor: 'rgba(20,4,40,0.55)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,201,60,0.55)',
    paddingVertical: 11,
    paddingHorizontal: 16,
    gap: 3,
  },
  ruleLabel: { color: colors.gold, fontFamily: fonts.display, fontSize: 14, letterSpacing: 2 },
  ruleText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24 },
  qCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 22,
    gap: 8,
    borderBottomWidth: 8,
    borderBottomColor: '#C9B8F0',
  },
  question: { color: colors.ink, fontSize: 26, fontFamily: fonts.display, lineHeight: 32, textAlign: 'center' },
  qHint: { color: '#6B5A99', fontSize: 15, fontFamily: fonts.bodySemi, textAlign: 'center' },
  answerCard: { backgroundColor: colors.green, borderRadius: 20, padding: 14, alignItems: 'center', borderBottomWidth: 6, borderBottomColor: colors.greenLip },
  answerLabel: { color: colors.ink, fontFamily: fonts.display, fontSize: 14, letterSpacing: 2, opacity: 0.7 },
  answer: { color: colors.ink, fontSize: 28, fontFamily: fonts.display, textAlign: 'center' },
  panel: { backgroundColor: 'rgba(20,4,40,0.55)', borderRadius: 24, padding: 16, gap: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  panelTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 22 },
  panelBody: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 16 },
  whoWon: { color: colors.gold, fontFamily: fonts.display, fontSize: 18, letterSpacing: 1.5, textAlign: 'center' },
  waitText: { color: colors.white, fontFamily: fonts.display, fontSize: 20, textAlign: 'center' },
  input: { backgroundColor: colors.white, color: colors.ink, fontSize: 18, fontFamily: fonts.bodySemi, padding: 12, borderRadius: 12 },
  resultSub: { color: colors.white, fontSize: 20, fontFamily: fonts.display, textAlign: 'center' },
  supGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  supCell: { width: '48.5%' },
  supporterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingVertical: 3, paddingHorizontal: 6 },
  supporterName: { color: colors.white, fontFamily: fonts.display, fontSize: 15, flex: 1 },
  plus: { backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, borderWidth: 2.5, borderColor: colors.ink },
  plusBig: { backgroundColor: colors.gold },
  plusText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16 },
  youCard: { alignItems: 'center', gap: 8, borderRadius: 28, paddingVertical: 22, paddingHorizontal: 16, borderWidth: 4, borderBottomWidth: 10 },
  youLose: { backgroundColor: '#E8324A', borderColor: '#8E0F22' },
  youNeutral: { backgroundColor: 'rgba(20,4,40,0.6)', borderColor: 'rgba(255,255,255,0.25)' },
  youLabel: { color: colors.white, fontFamily: fonts.display, fontSize: 19, letterSpacing: 0.5, opacity: 0.95, textAlign: 'center' },
  youBig: { textAlign: 'center', color: colors.white, fontFamily: fonts.display, fontSize: 40, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  youStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(20,4,40,0.6)', borderRadius: 20, padding: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  youWin: { backgroundColor: '#1FB866', borderColor: '#0B6B39' },
  youDrink: { borderColor: colors.red, backgroundColor: 'rgba(255,71,87,0.25)' },
  youHead: { color: colors.white, fontFamily: fonts.display, fontSize: 22 },
  youSub: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 16, opacity: 0.9, textAlign: 'center' },
  winnerBanner: { backgroundColor: colors.gold, borderRadius: 18, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 5, borderBottomColor: colors.goldLip },
  winnerText: { color: colors.ink, fontFamily: fonts.display, fontSize: 20 },
  drinkChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,71,87,0.3)', borderRadius: 99, paddingRight: 10, paddingLeft: 3, paddingVertical: 2 },
  drinkText: { color: colors.white, fontFamily: fonts.display, fontSize: 15 },
  rankNum: { color: colors.gold, fontFamily: fonts.display, fontSize: 20, width: 20, textAlign: 'center' },
  rowName: { color: colors.white, fontSize: 16, fontFamily: fonts.display, flexShrink: 1 },
  rowVal: { color: colors.dim, fontSize: 15, fontFamily: fonts.display },
});
