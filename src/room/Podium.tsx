import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { AWARD_BONUS, computeAwards } from '@/game/awards';
import { host, rankings, type GameState } from '@/game/engine';
import { showEndOfGameAd } from '@/monetize/store';
import { isBotId, useRoom } from '@/net/RoomProvider';
import { tokensForGame, useProfile } from '@/state/profile';
import { Coin, CoinReward } from '@/ui/Coin';
import { Confetti } from '@/ui/Confetti';
import { Button, Dim, Row } from '@/ui/kit';
import { Bob, PopIn, Pulse, SlideIn, Sway } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';
import { Slam, Sunburst } from './fx';
import { playerById } from './shared';
import { bounce } from '@/ui/motion';

const MEDALS = ['🥇', '🥈', '🥉'];
const STEP_H = [120, 86, 60];
const STEP_COLOR = [colors.gold, '#D7DEE8', '#E39B5A'];
// Reveal order: 3rd, then 2nd, then the winner.
const REVEAL_AT = [3200, 2000, 900];

function Step({ rank, children, revealAt }: { rank: number; children: React.ReactNode; revealAt: number }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(revealAt, bounce(STEP_H[rank - 1], 700, 1.4));
    const t = setTimeout(() => Haptics.impactAsync(rank === 1 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), revealAt + 200);
    return () => clearTimeout(t);
  }, [h, rank, revealAt]);
  const st = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <View style={{ alignItems: 'center', justifyContent: 'flex-end', width: 104 }}>
      {children}
      <Animated.View style={[styles.step, { backgroundColor: STEP_COLOR[rank - 1] }, st]}>
        <Text style={styles.stepRank}>{rank}</Text>
      </Animated.View>
    </View>
  );
}

export function Podium({ state }: { state: GameState }) {
  const { myId, isHost, dispatch, leaveRoom } = useRoom();
  const { profile, recordGame } = useProfile();
  const ranks = rankings(state);
  const awards = computeAwards(state);
  const mine = ranks.find((r) => r.player.id === myId);
  const [earned, setEarned] = useState<number>();
  const [stage, setStage] = useState(0); // 0 drumroll · 1 winner revealed · 2 details
  const recorded = useRef(false);
  const party = state.settings.mode === 'party';
  const hostPremium = !!host(state)?.premium;

  // Reveal order: 3rd at 0.9s, 2nd at 2.0s, winner (with confetti) at 3.2s.
  const order = ranks.slice(0, 3);
  const revealOf = (i: number) => REVEAL_AT[order.length === 3 ? i : i + (3 - order.length)] ?? 900;

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 3400);
    const t2 = setTimeout(() => setStage(2), 4400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (recorded.current || !mine) return;
    recorded.current = true;
    const myAwards = awards.filter((a) => a.playerId === mine.player.id).length;
    const coins = tokensForGame(mine.rank, mine.totals.correctBets, profile.premium) + myAwards * AWARD_BONUS;
    setEarned(coins);
    recordGame(mine.rank === 1 && mine.totals.points > 0, coins);
    // Ads are per person: every non-Premium player sees one, even in a Premium host's room.
    void showEndOfGameAd(profile.premium);
  }, [mine, profile.premium, recordGame, awards]);

  // Visual order on the podium: 2nd, 1st, 3rd.
  const podium = order.length === 3 ? [order[1], order[0], order[2]] : order;

  return (
    <View style={{ gap: 16 }}>
      {stage >= 1 && <Confetti count={90} />}
      <View style={{ alignItems: 'center', minHeight: 70, justifyContent: 'center' }}>
        {stage === 0 ? (
          <Pulse scale={1.08} duration={300}>
            <Text style={styles.drumroll}>🥁 And the winner is…</Text>
          </Pulse>
        ) : (
          <Slam text="🏆 WINNER! 🏆" size={46} color={colors.gold} />
        )}
      </View>

      <View style={{ alignItems: 'center' }}>
        {stage >= 1 && <Sunburst size={360} color="rgba(255,201,60,0.14)" />}
        <Row style={{ justifyContent: 'center', alignItems: 'flex-end', gap: 4 }}>
          {podium.map((r) => {
            const i = order.indexOf(r);
            const at = revealOf(i);
            return (
              <Step key={r.player.id} rank={r.rank > 3 ? 3 : r.rank} revealAt={at}>
                <PopIn delay={at + 250} from={0}>
                  <Text style={{ fontSize: 30, textAlign: 'center' }}>{MEDALS[Math.min(2, r.rank - 1)]}</Text>
                  <Bob amount={r.rank === 1 ? 8 : 4} duration={r.rank === 1 ? 450 : 800}>
                    <Sway deg={r.rank === 1 ? 5 : 4}>
                      <AnimalAvatar avatar={r.player.avatar} size={r.rank === 1 ? 92 : 68} mood={r.rank === 1 ? 'happy' : 'neutral'} />
                    </Sway>
                  </Bob>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {r.player.name}
                  </Text>
                  <Text style={styles.podiumPts}>{r.totals.points} pts</Text>
                </PopIn>
              </Step>
            );
          })}
        </Row>
      </View>

      {stage >= 2 && (
        <>
          {mine && (
            <PopIn>
              <View style={styles.rewardCard}>
                <Text style={styles.rewardTitle}>
                  You finished #{mine.rank}
                  {party ? ` · 🍺 ${mine.totals.sips} sips` : ''}
                </Text>
                {earned !== undefined && <CoinReward amount={earned} />}
                {awards.some((a) => a.playerId === mine.player.id) && (
                  <Text style={styles.rewardSmall}>
                    Includes 🎖️ +{AWARD_BONUS * awards.filter((a) => a.playerId === mine.player.id).length} award bonus
                  </Text>
                )}
                {profile.premium && <Text style={styles.rewardSmall}>👑 Premium 2× coins</Text>}
              </View>
            </PopIn>
          )}

          {awards.length > 0 && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>🎖️ Awards</Text>
              <Text style={styles.awardIntro}>Each award earns its winner +{AWARD_BONUS} gold coins</Text>
              {awards.map((a, i) => (
                <SlideIn key={a.id} from={i % 2 ? 'right' : 'left'} delay={i * 150} distance={100}>
                  <Row style={styles.awardRow}>
                    <Text style={{ fontSize: 30 }}>{a.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.awardTitle}>{a.title}</Text>
                      <Text style={styles.awardDesc}>{a.description}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={styles.awardName}>{playerById(state, a.playerId)?.name}</Text>
                      <PopIn delay={i * 150 + 400} from={2}>
                        <View style={styles.awardBonus}>
                          <Coin size={14} />
                          <Text style={styles.awardBonusText}>+{AWARD_BONUS}</Text>
                        </View>
                      </PopIn>
                    </View>
                  </Row>
                </SlideIn>
              ))}
            </View>
          )}

          {ranks.length > 3 && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>📊 Everyone else</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {ranks.slice(3).map((r, i) => (
                  <SlideIn key={r.player.id} from="bottom" delay={200 + i * 80} distance={30}>
                    <View style={styles.restChip}>
                      <Text style={styles.rankNum}>{r.rank}</Text>
                      <Sway>
                        <AnimalAvatar avatar={r.player.avatar} size={24} />
                      </Sway>
                      <Text style={styles.restName} numberOfLines={1}>
                        {r.player.name}
                      </Text>
                      <Text style={styles.rankVal}>
                        {r.totals.points}
                        {party ? ` · 🍺${r.totals.sips}` : ''}
                      </Text>
                    </View>
                  </SlideIn>
                ))}
              </View>
            </View>
          )}

          {party && !hostPremium && !profile.premium && (
            <PopIn delay={400}>
              <View style={styles.upsell}>
                <Text style={styles.upsellTitle}>Your crew loved Party Mode? 🍻</Text>
                <Dim>That was your free game. Unlock it forever for $4.99.</Dim>
                <Button label="🔓 Unlock Party Mode" onPress={() => router.push('/paywall')} />
              </View>
            </PopIn>
          )}
          {party && hostPremium && !profile.premium && !isHost && (
            <PopIn delay={400}>
              <View style={styles.upsell}>
                <Text style={styles.upsellTitle}>Want to host Party Mode yourself?</Text>
                <Button variant="secondary" label="👑 See Premium" onPress={() => router.push('/paywall')} />
              </View>
            </PopIn>
          )}

          {isHost && (
            <Pulse scale={1.03} duration={700}>
              <Button big variant="green" label="🔁 Rematch!" onPress={() => dispatch({ type: 'rematch' })} />
            </Pulse>
          )}
          <Button
            small
            variant="ghost"
            label="Leave"
            onPress={() => {
              leaveRoom();
              router.replace('/');
            }}
          />
          {state.players.some((p) => isBotId(p.id)) && <Dim style={{ textAlign: 'center' }}>Practice games still earn coins.</Dim>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  drumroll: { color: colors.white, fontFamily: fonts.display, fontSize: 34, textAlign: 'center' },
  step: {
    width: 96,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    overflow: 'hidden',
    borderBottomWidth: 0,
  },
  stepRank: { color: colors.ink, fontFamily: fonts.display, fontSize: 34, opacity: 0.6 },
  podiumName: { color: colors.white, fontFamily: fonts.display, fontSize: 16, textAlign: 'center', maxWidth: 100 },
  podiumPts: { color: colors.gold, fontFamily: fonts.display, fontSize: 15, textAlign: 'center', marginBottom: 4 },
  rewardCard: { backgroundColor: 'rgba(255,201,60,0.15)', borderColor: colors.gold, borderWidth: 2.5, borderRadius: 24, padding: 16, alignItems: 'center', gap: 6 },
  rewardTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 22 },
  rewardSmall: { color: colors.gold, fontFamily: fonts.bodySemi, fontSize: 14 },
  panel: { backgroundColor: 'rgba(20,4,40,0.55)', borderRadius: 24, padding: 16, gap: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  panelTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 22 },
  awardRow: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 8 },
  awardTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 18 },
  awardDesc: { color: colors.dim, fontFamily: fonts.body, fontSize: 13 },
  awardIntro: { color: colors.gold, fontFamily: fonts.bodySemi, fontSize: 13, marginTop: -6 },
  awardBonus: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,201,60,0.2)', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 1 },
  awardBonusText: { color: colors.gold, fontFamily: fonts.display, fontSize: 13 },
  awardName: { color: colors.gold, fontFamily: fonts.display, fontSize: 16 },
  rankNum: { color: colors.gold, fontFamily: fonts.display, fontSize: 18, width: 20, textAlign: 'center' },
  restChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  restName: { color: colors.white, fontFamily: fonts.display, fontSize: 13, maxWidth: 80 },
  rank: { color: colors.white, fontSize: 16, fontFamily: fonts.display, flexShrink: 1 },
  rankVal: { color: colors.dim, fontSize: 15, fontFamily: fonts.display },
  upsell: { backgroundColor: colors.party, borderColor: colors.neon, borderWidth: 2.5, borderRadius: 24, padding: 16, gap: 10 },
  upsellTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 22 },
});
