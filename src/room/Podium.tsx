import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { computeAwards } from '@/game/awards';
import { host, rankings, type GameState } from '@/game/engine';
import { showEndOfGameAd } from '@/monetize/store';
import { isBotId, useRoom } from '@/net/RoomProvider';
import { tokensForGame, useProfile } from '@/state/profile';
import { Body, Button, Card, Dim, H1, H2, Row, theme } from '@/ui/kit';
import { PlayerBadge, playerById } from './shared';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Podium({ state }: { state: GameState }) {
  const { myId, isHost, dispatch, leaveRoom } = useRoom();
  const { profile, recordGame } = useProfile();
  const ranks = rankings(state);
  const awards = computeAwards(state);
  const mine = ranks.find((r) => r.player.id === myId);
  const [earned, setEarned] = useState<number>();
  const recorded = useRef(false);
  const party = state.settings.mode === 'party';
  const hostPremium = !!host(state)?.premium;

  useEffect(() => {
    if (recorded.current || !mine) return;
    recorded.current = true;
    const tokens = tokensForGame(mine.rank, mine.totals.correctBets, profile.premium);
    setEarned(tokens);
    recordGame(mine.rank === 1 && mine.totals.points > 0, tokens);
    // Ads are per person: every non-Premium player sees one, even in a Premium host's room.
    void showEndOfGameAd(profile.premium);
  }, [mine, profile.premium, recordGame]);

  const top = ranks.slice(0, 3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;

  return (
    <View style={{ gap: 14 }}>
      <H1 style={{ textAlign: 'center' }}>🏆 Final results</H1>
      <Row style={{ justifyContent: 'center', alignItems: 'flex-end' }}>
        {order.map((r) => (
          <View key={r.player.id} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 30 }}>{MEDALS[r.rank - 1] ?? ''}</Text>
            <PlayerBadge player={r.player} size={r.rank === 1 ? 92 : 68} mood={r.rank === 1 ? 'happy' : undefined} />
            <View style={[styles.step, { height: r.rank === 1 ? 70 : r.rank === 2 ? 48 : 32 }]}>
              <Text style={styles.stepText}>{r.totals.points}</Text>
            </View>
          </View>
        ))}
      </Row>

      {mine && (
        <Card style={{ alignItems: 'center' }}>
          <Body>
            You finished #{mine.rank} with {mine.totals.points} points
            {party ? ` and ${mine.totals.sips} sips` : ''}.
          </Body>
          {earned !== undefined && (
            <Text style={styles.earned}>
              +{earned} 🪙{profile.premium ? ' (2× Premium)' : ''}
            </Text>
          )}
        </Card>
      )}

      {awards.length > 0 && (
        <Card>
          <H2>Awards</H2>
          {awards.map((a) => (
            <Row key={a.id} style={{ justifyContent: 'space-between' }}>
              <Text style={styles.award}>
                {a.emoji} {a.title}
              </Text>
              <Dim>{playerById(state, a.playerId)?.name}</Dim>
            </Row>
          ))}
        </Card>
      )}

      <Card>
        <H2>Rankings</H2>
        {ranks.map((r) => (
          <Row key={r.player.id} style={{ justifyContent: 'space-between' }}>
            <Text style={styles.rank}>
              {r.rank}. {r.player.name}
            </Text>
            <Text style={styles.rankVal}>
              {r.totals.points} pts{party ? ` · 🍺 ${r.totals.sips}` : ''}
            </Text>
          </Row>
        ))}
      </Card>

      {party && !hostPremium && !profile.premium && (
        <Card style={{ backgroundColor: '#4A1F5C' }}>
          <H2>Your crew loved Party mode?</H2>
          <Dim>That was the free trial. Unlock it forever for $4.99.</Dim>
          <Button label="Unlock Party mode" onPress={() => router.push('/paywall')} />
        </Card>
      )}
      {party && hostPremium && !profile.premium && !isHost && (
        <Card style={{ backgroundColor: '#4A1F5C' }}>
          <H2>Want to host Party mode yourself?</H2>
          <Button label="See Premium" variant="secondary" onPress={() => router.push('/paywall')} />
        </Card>
      )}

      {isHost && <Button label="🔁 Rematch" onPress={() => dispatch({ type: 'rematch' })} />}
      <Button
        label="Leave"
        variant="ghost"
        onPress={() => {
          leaveRoom();
          router.replace('/');
        }}
      />
      {state.players.some((p) => isBotId(p.id)) && <Dim style={{ textAlign: 'center' }}>Practice games still earn tokens.</Dim>}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { width: 84, backgroundColor: theme.cardHi, borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: theme.accent, fontWeight: '900', fontSize: 20 },
  earned: { color: theme.accent, fontWeight: '900', fontSize: 22 },
  award: { color: theme.text, fontSize: 16, fontWeight: '800' },
  rank: { color: theme.text, fontSize: 16, fontWeight: '700' },
  rankVal: { color: theme.dim, fontSize: 16, fontWeight: '800' },
});
