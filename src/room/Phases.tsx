import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CATEGORY_BY_ID, DIFFICULTY_LABEL } from '@/content/categories';
import { wheelSlices } from '@/content/picker';
import { DURATIONS, host, isFinalRound, pendingBettors, type GameState } from '@/game/engine';
import type { Outcome, Pick } from '@/game/types';
import { useRoom } from '@/net/RoomProvider';
import { A_COLOR, B_COLOR, Body, Button, Card, Dim, H1, H2, Pill, Row, tap, theme } from '@/ui/kit';
import { PlayerBadge, playerById, useTimeLeft } from './shared';
import { Wheel } from './Wheel';

function Challengers({ state, moodA, moodB, size = 110 }: { state: GameState; moodA?: any; moodB?: any; size?: number }) {
  const [a, b] = state.round!.challengers;
  return (
    <Row style={{ justifyContent: 'center', gap: 4 }}>
      <PlayerBadge player={playerById(state, a)} size={size} mood={moodA} color={A_COLOR} />
      <Text style={styles.vs}>VS</Text>
      <PlayerBadge player={playerById(state, b)} size={size} mood={moodB} color={B_COLOR} />
    </Row>
  );
}

function RoundHeader({ state }: { state: GameState }) {
  const r = state.round!;
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Pill label={`Round ${r.number} / ${state.settings.rounds}`} />
      {isFinalRound(state) && <Pill label="🔥 FINAL ROUND · ×2" color={theme.red} />}
    </Row>
  );
}

export function Matchup({ state }: { state: GameState }) {
  const { myId } = useRoom();
  const r = state.round!;
  const mine = r.challengers.includes(myId);
  useEffect(() => {
    if (mine) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [mine]);
  return (
    <View style={styles.center}>
      <RoundHeader state={state} />
      <H1 style={{ textAlign: 'center' }}>{mine ? "🔥 You're up!" : 'Next face-off'}</H1>
      <Challengers state={state} moodA={r.challengers[0] === myId ? 'nervous' : undefined} moodB={r.challengers[1] === myId ? 'nervous' : undefined} />
    </View>
  );
}

export function Spin({ state }: { state: GameState }) {
  const r = state.round!;
  const h = host(state);
  return (
    <View style={styles.center}>
      <RoundHeader state={state} />
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

function CategoryLine({ state }: { state: GameState }) {
  const r = state.round!;
  const c = CATEGORY_BY_ID[r.category];
  return (
    <Row style={{ justifyContent: 'center' }}>
      <Pill label={`${c.emoji} ${c.label}`} color={c.color} textColor={theme.ink} />
      <Pill label={DIFFICULTY_LABEL[r.question.difficulty]} />
    </Row>
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

  const voted = r.bettors.length - pendingBettors(state).length;
  const bet = (pick: Pick) => {
    tap('medium');
    dispatch({ type: 'bet', playerId: myId, pick, now: Date.now() });
  };
  const [a, b] = r.challengers;

  return (
    <View style={[styles.center, pressure && styles.pressure]}>
      <RoundHeader state={state} />
      <CategoryLine state={state} />
      <Text style={[styles.timer, pressure && { color: theme.red }]}>{secs}</Text>
      {canBet && !myBet ? (
        <>
          <H2 style={{ textAlign: 'center' }}>Who wins? Call it!</H2>
          <Row style={{ justifyContent: 'center', gap: 12 }}>
            <Pressable style={[styles.pick, { borderColor: A_COLOR }]} onPress={() => bet('A')} accessibilityRole="button">
              <PlayerBadge player={playerById(state, a)} size={96} color={A_COLOR} />
            </Pressable>
            <Pressable style={[styles.pick, { borderColor: B_COLOR }]} onPress={() => bet('B')} accessibilityRole="button">
              <PlayerBadge player={playerById(state, b)} size={96} color={B_COLOR} />
            </Pressable>
          </Row>
          <Button
            label={state.settings.mode === 'party' ? 'No Vote (costs 1 sip)' : 'No Vote'}
            variant="ghost"
            onPress={() => bet('NONE')}
          />
        </>
      ) : (
        <>
          <Challengers state={state} size={90} moodA={r.challengers[0] === myId ? 'nervous' : undefined} moodB={r.challengers[1] === myId ? 'nervous' : undefined} />
          <H2 style={{ textAlign: 'center' }}>
            {myBet
              ? myBet === 'NONE'
                ? 'You sat this one out'
                : `You called ${playerById(state, myBet === 'A' ? a : b)?.name}!`
              : r.challengers.includes(myId)
                ? 'Bets are coming in…'
                : 'Bets are coming in…'}
          </H2>
          <Dim style={{ textAlign: 'center' }}>
            {voted} / {r.bettors.length} have called it
          </Dim>
        </>
      )}
    </View>
  );
}

export function BetsReveal({ state }: { state: GameState }) {
  const r = state.round!;
  const side = (pick: 'A' | 'B') => r.bettors.filter((id) => r.bets[id] === pick).map((id) => playerById(state, id)!);
  const none = r.bettors.filter((id) => !r.bets[id] || r.bets[id] === 'NONE').map((id) => playerById(state, id)!);
  const total = side('A').length + side('B').length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return (
    <View style={styles.center}>
      <RoundHeader state={state} />
      <H2 style={{ textAlign: 'center' }}>The room has spoken</H2>
      <Row style={{ alignItems: 'flex-start', justifyContent: 'center', gap: 8 }}>
        {(['A', 'B'] as const).map((p, i) => (
          <View key={p} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <PlayerBadge player={playerById(state, r.challengers[i])} size={90} color={p === 'A' ? A_COLOR : B_COLOR} />
            <Text style={[styles.pct, { color: p === 'A' ? A_COLOR : B_COLOR }]}>{pct(side(p).length)}%</Text>
            <View style={styles.stack}>
              {side(p).map((pl) => (
                <PlayerBadge key={pl.id} player={pl} size={34} />
              ))}
            </View>
          </View>
        ))}
      </Row>
      {none.length > 0 && <Dim style={{ textAlign: 'center' }}>No Vote: {none.map((p) => p.name).join(', ')}</Dim>}
    </View>
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

  const judge = (outcome: Outcome) => {
    tap('heavy');
    dispatch({ type: 'judge', by: myId, outcome, now: Date.now() });
  };
  const [a, b] = r.challengers;

  return (
    <View style={{ gap: 14 }}>
      <RoundHeader state={state} />
      <CategoryLine state={state} />
      <Challengers state={state} size={72} />
      <Card style={{ backgroundColor: theme.cardHi }}>
        <Text style={styles.question}>{prompt}</Text>
        {q.type === 'SPOKEN_CLOSEST' && <Dim>Both say a number out loud. Closest wins.</Dim>}
        {q.type === 'SPOKEN_EXACT' && <Dim>First to say the right answer out loud wins.</Dim>}
      </Card>

      {isSubject && (
        <Card>
          <H2>🤫 You're the subject</H2>
          {r.subjectAnswer ? (
            <Body>Your secret answer: {r.subjectAnswer}. Judge who got closest!</Body>
          ) : (
            <>
              <Dim>Type the real answer secretly before they guess.</Dim>
              <TextInput
                value={subjectDraft}
                onChangeText={setSubjectDraft}
                placeholder="Your real answer"
                placeholderTextColor={theme.dim}
                style={styles.input}
              />
              <Button
                label="Lock it in"
                disabled={!subjectDraft.trim()}
                onPress={() => dispatch({ type: 'subjectAnswer', playerId: myId, answer: subjectDraft.trim() })}
              />
            </>
          )}
        </Card>
      )}

      {r.answerShownToAll && answer && (
        <Card style={{ backgroundColor: theme.green }}>
          <Text style={[styles.question, { color: theme.ink }]}>Answer: {answer}</Text>
        </Card>
      )}

      {canJudge ? (
        <Card>
          <H2>{isJudge ? '⚖️ You judge this round' : `⚖️ ${judgeName} judges · host override`}</H2>
          {answer !== undefined || q.answer ? (
            revealed ? (
              <>
                <Text style={styles.answer}>{answer ?? '—'}</Text>
                {!r.answerShownToAll && (
                  <Button small variant="secondary" label="Show on all screens" onPress={() => dispatch({ type: 'showAnswerToAll' })} />
                )}
              </>
            ) : (
              <Button
                variant="secondary"
                label="👁️ Reveal answer"
                disabled={q.type === 'SUBJECT_JUDGED' && !r.subjectAnswer}
                onPress={() => setRevealed(true)}
              />
            )
          ) : null}
          {q.type === 'SUBJECT_JUDGED' && !r.subjectAnswer && <Dim>Waiting for {subject?.name} to lock in their answer…</Dim>}
          {q.type === 'TURN_BASED' && (
            <Button
              small
              variant="ghost"
              label={stallStart !== undefined && stallLeft > 0 ? `⏱️ ${Math.ceil(stallLeft / 1000)}s` : '⏱️ Start 5s stall timer'}
              onPress={() => setStallStart(Date.now())}
            />
          )}
          <Body>Who won?</Body>
          <Row>
            <Button style={{ flex: 1 }} variant="a" label={playerById(state, a)?.name ?? 'A'} onPress={() => judge('A')} />
            <Button style={{ flex: 1 }} variant="b" label={playerById(state, b)?.name ?? 'B'} onPress={() => judge('B')} />
          </Row>
          <Button small variant="ghost" label="Draw" onPress={() => judge('DRAW')} />
        </Card>
      ) : (
        <Dim style={{ textAlign: 'center' }}>{judgeName} is judging…</Dim>
      )}

      {isHost && (
        <Row style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button small variant="ghost" label="Skip round" onPress={() => dispatch({ type: 'skipRound', now: Date.now() })} />
          <Button small variant="ghost" label={`Swap ${playerById(state, a)?.name}`} onPress={() => dispatch({ type: 'swapChallenger', out: a, now: Date.now() })} />
          <Button small variant="ghost" label={`Swap ${playerById(state, b)?.name}`} onPress={() => dispatch({ type: 'swapChallenger', out: b, now: Date.now() })} />
        </Row>
      )}
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

  useEffect(() => {
    if (!mine) return;
    const good = mine.points > 0;
    Haptics.notificationAsync(good ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [mine]);

  let headline = '';
  let sub = '';
  let bg: string = theme.card;
  let mood: 'happy' | 'drink' | 'neutral' = 'neutral';
  if (!mine) {
    headline = r.outcome === 'DRAW' ? "It's a draw!" : `${playerById(state, winnerId)?.name} wins!`;
  } else if (mine.points > 0) {
    headline = `WIN +${mine.points}`;
    sub = mine.result === 'betWin' && score.multiplier > 1 ? `Underdog bonus ×${score.multiplier}!` : mine.result === 'challengerWin' ? 'You won the face-off!' : 'You called it!';
    bg = theme.green;
    mood = 'happy';
  } else if (party && (mine.sips > 0 || mine.shot)) {
    headline = mine.shot ? 'TAKE A SHOT!' : `DRINK! ${mine.sips} sip${mine.sips === 1 ? '' : 's'}`;
    sub = mine.result === 'noVote' ? 'That’s the No Vote tax' : mine.result === 'draw' ? 'A draw means both challengers drink' : score.multiplier > 1 ? `Huge upset ×${score.multiplier}!` : '';
    bg = theme.red;
    mood = 'drink';
  } else {
    headline = mine.result === 'noVote' ? 'No Vote' : mine.result === 'draw' ? 'Draw' : 'LOSS';
    sub = '+0';
    bg = theme.cardHi;
  }

  return (
    <View style={{ gap: 14 }}>
      <RoundHeader state={state} />
      <Card style={{ backgroundColor: bg, alignItems: 'center', paddingVertical: 28 }}>
        {me && mine && <PlayerBadge player={me} size={120} mood={mood} />}
        <Text style={[styles.big, bg !== theme.card && bg !== theme.cardHi && { color: theme.ink }]}>{headline}</Text>
        {sub ? <Text style={[styles.subBig, bg !== theme.card && bg !== theme.cardHi && { color: theme.ink }]}>{sub}</Text> : null}
      </Card>
      <Card>
        <H2>{r.outcome === 'DRAW' ? 'Draw' : `🏆 ${playerById(state, winnerId)?.name} won the round`}</H2>
        {state.players.map((p) => {
          const s = score.perPlayer[p.id];
          if (!s) return null;
          return (
            <Row key={p.id} style={{ justifyContent: 'space-between' }}>
              <Text style={styles.rowName}>{p.name}</Text>
              <Text style={styles.rowVal}>
                {s.points > 0 ? `+${s.points}` : '+0'}
                {party && s.sips > 0 ? `  🍺 ${s.sips}` : ''}
                {s.shot ? '  🥃 shot' : ''}
              </Text>
            </Row>
          );
        })}
      </Card>
      {isHost && <Button label={isFinalRound(state) ? 'See final results' : 'Next round'} onPress={() => dispatch({ type: 'next', now: Date.now() })} />}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { gap: 16, alignItems: 'stretch', justifyContent: 'center', flexGrow: 1, borderRadius: 24, padding: 4 },
  vs: { color: theme.accent, fontSize: 28, fontWeight: '900', marginHorizontal: 4 },
  timer: { color: theme.text, fontSize: 64, fontWeight: '900', textAlign: 'center' },
  pressure: { backgroundColor: 'rgba(255,77,94,0.18)' },
  pick: { borderWidth: 4, borderRadius: 24, padding: 10, backgroundColor: theme.card },
  pct: { fontSize: 32, fontWeight: '900' },
  stack: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  question: { color: theme.text, fontSize: 22, fontWeight: '800', lineHeight: 30 },
  answer: { color: theme.accent, fontSize: 24, fontWeight: '900' },
  input: { backgroundColor: theme.bg2, color: theme.text, fontSize: 18, padding: 12, borderRadius: 12 },
  big: { color: theme.text, fontSize: 40, fontWeight: '900', textAlign: 'center' },
  subBig: { color: theme.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  rowName: { color: theme.text, fontSize: 16, fontWeight: '700' },
  rowVal: { color: theme.dim, fontSize: 16, fontWeight: '800' },
});
