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
import { Bob, PopIn, Pulse, Shake, SlideIn, Wobble } from '@/ui/motion';
import { A_COLOR, A_LIP, B_COLOR, B_LIP, colors, fonts } from '@/ui/theme';
import { CountdownRing, DangerVignette, EmojiRain, GrowBar, Slam, Sunburst } from './fx';
import { PlayerBadge, playerById, useTimeLeft } from './shared';
import { Wheel } from './Wheel';
import { UnderdogAlert, UnderdogTag, UnderdogVictory } from './Underdog';
import { Modal } from 'react-native';
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
        <Pill label={`${c.emoji} ${c.label.toUpperCase()}`} color={c.color} textColor={colors.ink} />
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
        {p && <AnimalAvatar avatar={p.avatar} size={size} mood={mood} />}
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
  return (
    <View style={styles.stage}>
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 150 }}>
        <Sunburst size={420} color={final ? 'rgba(255,71,87,0.18)' : 'rgba(255,255,255,0.07)'} />
        <Slam text={final ? '🔥 FINAL ROUND 🔥' : `ROUND ${r.number}`} size={final ? 44 : 64} color={final ? colors.gold : colors.white} />
        <SlideIn from="bottom" delay={500}>
          <Text style={styles.subHead}>{final ? 'Double points. Double sips.' : `of ${state.settings.rounds}`}</Text>
        </SlideIn>
      </View>
      <FaceOff state={state} moodFor={(id) => (id === myId ? 'nervous' : undefined)} />
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
            {p && <AnimalAvatar avatar={p.avatar} size={100} mood="nervous" />}
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
      <Text style={styles.dogHint}>🐶 Back the long shot: 25% or less = UNDERDOG ×3</Text>

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
          <FaceOff state={state} size={92} moodFor={(id) => (id === myId ? 'nervous' : undefined)} />
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
                <AnimalAvatar avatar={p.avatar} size={34} mood="happy" />
              </PopIn>
            ) : null;
          })}
        </Row>
      </View>
    </View>
  );
}

function PercentLabel({ pct, color }: { pct: number; color: string }) {
  const shown = useCountUp(pct, 1000);
  return <Text style={[styles.pct, { color }]}>{shown}%</Text>;
}

export function BetsReveal({ state }: { state: GameState }) {
  const r = state.round!;
  const side = (pick: 'A' | 'B') => r.bettors.filter((id) => r.bets[id] === pick).map((id) => playerById(state, id)!).filter(Boolean);
  const none = r.bettors.filter((id) => !r.bets[id] || r.bets[id] === 'NONE').map((id) => playerById(state, id)!).filter(Boolean);
  const total = side('A').length + side('B').length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const dog = currentUnderdog(state);
  const dogPlayer = dog ? playerById(state, r.challengers[dog === 'A' ? 0 : 1]) : undefined;

  return (
    <View style={styles.stage}>
      {dog && dogPlayer && (
        <Modal visible transparent animationType="none">
          <UnderdogAlert
            underdog={dogPlayer}
            share={side(dog).length / Math.max(1, total)}
            backers={side(dog)}
            mode={state.settings.mode}
          />
        </Modal>
      )}
      <RoundHeader state={state} />
      <Slam text="THE ROOM HAS SPOKEN" size={34} />
      <Row style={{ alignItems: 'flex-start', gap: 10 }}>
        {(['A', 'B'] as const).map((p, i) => {
          const color = p === 'A' ? A_COLOR : B_COLOR;
          const backers = side(p);
          return (
            <View key={p} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <SlideIn from={p === 'A' ? 'left' : 'right'} distance={120}>
                <PlayerBadge player={playerById(state, r.challengers[i])} size={92} color={color} bob />
              </SlideIn>
              {dog === p && <UnderdogTag mode={state.settings.mode} />}
              <PercentLabel pct={pct(backers.length)} color={color} />
              <GrowBar pct={pct(backers.length)} color={color} delay={200} />
              <View style={styles.stack}>
                {backers.map((pl, j) => (
                  <SlideIn key={pl.id} from="top" distance={50} delay={400 + j * 140}>
                    <AnimalAvatar avatar={pl.avatar} size={40} mood="happy" />
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
  const isJudge = r.judgeId === myId;
  const canJudge = isJudge || isHost;
  const isSubject = r.subjectId === myId;
  const prompt = q.prompt.replace(/\{S\}/g, subject?.name ?? 'them');
  const answer = q.type === 'SUBJECT_JUDGED' ? r.subjectAnswer : q.answer;
  const judgeName = playerById(state, r.judgeId)?.name ?? 'the host';
  const dog = currentUnderdog(state);
  const hint =
    q.type === 'SPOKEN_CLOSEST'
      ? 'Both shout a number. Closest wins!'
      : q.type === 'SPOKEN_EXACT'
        ? 'First to shout the right answer wins!'
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
          <PlayerBadge player={playerById(state, a)} size={64} color={A_COLOR} bob />
          {dog === 'A' && <UnderdogTag mode={state.settings.mode} />}
        </SlideIn>
        <VsBadge delay={150} />
        <SlideIn from="right" style={{ alignItems: 'center', gap: 4 }}>
          <PlayerBadge player={playerById(state, b)} size={64} color={B_COLOR} bob />
          {dog === 'B' && <UnderdogTag mode={state.settings.mode} />}
        </SlideIn>
      </Row>
      <QuestionCard text={prompt} hint={hint} />

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
            <Text style={styles.panelTitle}>{isJudge ? '⚖️ You’re the judge' : `⚖️ ${judgeName} judges · you can override`}</Text>
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

/** Per-player result kind, used to tint the whole screen. */
export function myResultTint(state: GameState, myId: string): 'green' | 'red' | undefined {
  const s = state.round?.score?.perPlayer[myId];
  if (!s) return undefined;
  if (s.points > 0) return 'green';
  if (state.settings.mode === 'party' && (s.sips > 0 || s.shot)) return 'red';
  return undefined;
}

function Standings({ state }: { state: GameState }) {
  const rows = rankings(state).slice(0, 5);
  const max = Math.max(1, ...rows.map((r) => r.totals.points));
  const lastRound = state.round?.score?.perPlayer ?? {};
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>📊 Standings</Text>
      {rows.map((r, i) => (
        <SlideIn key={r.player.id} from="right" delay={500 + i * 110} distance={80}>
          <Row style={{ gap: 8 }}>
            <Text style={styles.rankNum}>{r.rank}</Text>
            <AnimalAvatar avatar={r.player.avatar} size={34} mood={i === 0 ? 'happy' : undefined} />
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
              <GrowBar pct={(r.totals.points / max) * 100} color={i === 0 ? colors.gold : colors.violet} height={8} delay={600 + i * 110} />
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
    sub = mine.result === 'betWin' && score.multiplier > 1 ? `🐶 UNDERDOG BONUS ×${score.multiplier}!` : mine.result === 'challengerWin' ? 'You won the face-off!' : 'You called it!';
  } else if (party && (mine.sips > 0 || mine.shot)) {
    kind = 'drink';
    headline = mine.shot ? 'SHOT!' : `DRINK ${mine.sips}`;
    sub =
      mine.result === 'noVote'
        ? 'That’s the No Vote tax 🍺'
        : mine.result === 'draw'
          ? 'Draws mean both challengers drink'
          : score.multiplier > 1
            ? `🐶 Underdog won · ×${score.multiplier} sips! 😱`
            : mine.sips === 1
              ? 'One sip. Bottoms up!'
              : 'Sips. Bottoms up!';
  } else {
    kind = 'loss';
    headline = mine.result === 'noVote' ? 'NO VOTE' : mine.result === 'draw' ? 'DRAW' : 'MISSED IT';
    sub = '+0 this round';
  }

  return (
    <View style={{ gap: 14 }}>
      {kind === 'win' && <Confetti count={70} />}
      {kind === 'drink' && <EmojiRain emoji={mine?.shot ? '🥃' : '🍺'} count={16} />}
      <RoundHeader state={state} />
      <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
        <Sunburst size={440} color={kind === 'win' ? 'rgba(255,255,255,0.14)' : kind === 'drink' ? 'rgba(255,220,120,0.12)' : 'rgba(255,255,255,0.05)'} />
        {me && mine && (
          <PopIn from={0.2}>
            {kind === 'drink' ? (
              <Wobble deg={10} duration={300}>
                <AnimalAvatar avatar={me.avatar} size={130} mood="drink" />
              </Wobble>
            ) : kind === 'loss' ? (
              <Shake trigger={1} strength={12}>
                <AnimalAvatar avatar={me.avatar} size={130} mood="nervous" />
              </Shake>
            ) : (
              <Bob amount={8} duration={400}>
                <AnimalAvatar avatar={me.avatar} size={130} mood="happy" />
              </Bob>
            )}
          </PopIn>
        )}
        <Slam text={headline} size={kind === 'neutral' ? 40 : 62} color={kind === 'win' ? colors.gold : kind === 'drink' ? colors.white : colors.white} delay={150} />
        {sub ? (
          <SlideIn from="bottom" delay={450}>
            <Text style={styles.resultSub}>{sub}</Text>
          </SlideIn>
        ) : null}
      </View>

      {score.multiplier > 1 ? (
        <UnderdogVictory name={playerById(state, winnerId)?.name ?? ''} mode={state.settings.mode} />
      ) : (
        <SlideIn from="bottom" delay={350}>
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerText}>{r.outcome === 'DRAW' ? '🤝 Draw!' : `🏆 ${playerById(state, winnerId)?.name} won the face-off`}</Text>
          </View>
        </SlideIn>
      )}

      {party && (
        <SlideIn from="bottom" delay={450}>
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

      <Standings state={state} />

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
  stack: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  backerName: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 11, textAlign: 'center', maxWidth: 52 },
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
  winnerBanner: { backgroundColor: colors.gold, borderRadius: 18, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 5, borderBottomColor: colors.goldLip },
  winnerText: { color: colors.ink, fontFamily: fonts.display, fontSize: 20 },
  drinkChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,71,87,0.3)', borderRadius: 99, paddingRight: 10, paddingLeft: 3, paddingVertical: 2 },
  drinkText: { color: colors.white, fontFamily: fonts.display, fontSize: 15 },
  rankNum: { color: colors.gold, fontFamily: fonts.display, fontSize: 20, width: 20, textAlign: 'center' },
  rowName: { color: colors.white, fontSize: 16, fontFamily: fonts.display, flexShrink: 1 },
  rowVal: { color: colors.dim, fontSize: 15, fontFamily: fonts.display },
});
