import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { CATEGORIES } from '@/content/categories';
import { CategoryIcon } from '@/content/CategoryIcon';
import type { Category } from '@/game/types';
import { MyQuestionsList } from '@/room/MyQuestions';
import { useProfile } from '@/state/profile';
import { Button, Card, Dim, H2, Row, Screen, Toggle } from '@/ui/kit';
import { Bob } from '@/ui/motion';
import { colors, fonts } from '@/ui/theme';

/** "You": avatar, stats, Premium status and "My questions" (your personal question bank). */
export default function Account() {
  const { profile, update } = useProfile();
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const mine = profile.myQuestions ?? [];
  const used = CATEGORIES.filter((c) => mine.some((q) => q.category === c.id));
  const shown = filter === 'all' ? mine : mine.filter((q) => q.category === filter);
  const winRate = profile.gamesPlayed ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) : 0;

  return (
    <Screen scroll>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button small variant="ghost" label="← Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        {profile.premium ? <Text style={styles.premium}>👑 PREMIUM</Text> : null}
      </Row>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Pressable onPress={() => router.push('/avatar')} accessibilityLabel="Customize your avatar">
          <Bob amount={5} duration={900}>
            <AnimalAvatar avatar={profile.avatar} size={110} mood="happy" />
          </Bob>
        </Pressable>
        <Text style={styles.name}>{profile.name}</Text>
        <Button small variant="secondary" label="🎨 Customize avatar" onPress={() => router.push('/avatar')} />
      </View>

      <Row style={{ gap: 8 }}>
        <Stat label="Games" value={profile.gamesPlayed} />
        <Stat label="Wins" value={profile.gamesWon} />
        <Stat label="Win rate" value={`${winRate}%`} />
        <Stat label="Coins" value={profile.tokens} />
      </Row>

      {!profile.premium && (
        <Pressable onPress={() => router.push('/paywall')}>
          <View style={styles.upsell}>
            <Text style={styles.upsellText}>👑 Premium: Party & Spicy, your own questions in every lobby, no ads</Text>
          </View>
        </Pressable>
      )}

      <Card>
        <H2>⚙️ This phone</H2>
        <Toggle label="🔊 Sound effects" value={profile.soundOn !== false} onChange={(v) => update({ soundOn: v })} />
        <Toggle label="📳 Vibration" value={profile.hapticsOn !== false} onChange={(v) => update({ hapticsOn: v })} />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>📚 My questions</H2>
          <Text style={styles.count}>{mine.length}</Text>
        </Row>
        <Dim style={{ fontSize: 13 }}>
          Every question you add to a lobby is saved here automatically. In any Premium lobby, open "Add your own questions" → "Mine" and tap
          questions to put them in or take them out (or select all). "Delete forever" removes one from here for good. Saved on this phone for now;
          it moves to your account once sign-in is available.
        </Dim>
        {used.length > 0 && (
          <View style={styles.filters}>
            <Pressable accessibilityRole="button" onPress={() => setFilter('all')} style={[styles.filter, filter === 'all' && styles.filterOn]}>
              <Text style={[styles.filterText, filter === 'all' && { color: colors.ink }]}>All</Text>
            </Pressable>
            {used.map((c) => {
              const n = mine.filter((q) => q.category === c.id).length;
              const on = filter === c.id;
              return (
                <Pressable key={c.id} accessibilityRole="button" accessibilityLabel={`${c.label}: ${n}`} onPress={() => setFilter(c.id)} style={[styles.filter, on && styles.filterOn]}>
                  <CategoryIcon category={c.id} size={14} />
                  <Text style={[styles.filterText, on && { color: colors.ink }]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {mine.length === 0 ? (
          <Dim style={{ textAlign: 'center', paddingVertical: 10 }}>No questions yet. Write some in your next lobby! ✍️</Dim>
        ) : (
          <MyQuestionsList questions={shown} />
        )}
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.white, fontFamily: fonts.display, fontSize: 30 },
  premium: { color: colors.gold, fontFamily: fonts.display, fontSize: 16 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 8 },
  statValue: { color: colors.gold, fontFamily: fonts.display, fontSize: 22 },
  statLabel: { color: colors.dim, fontFamily: fonts.bodyBold, fontSize: 11 },
  upsell: { borderWidth: 2, borderColor: colors.gold, borderRadius: 16, padding: 10, backgroundColor: 'rgba(255,201,60,0.12)' },
  upsellText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center' },
  count: { color: colors.gold, fontFamily: fonts.display, fontSize: 20 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  filterOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { color: colors.white, fontFamily: fonts.display, fontSize: 13 },
});
