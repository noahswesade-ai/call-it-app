import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnimalAvatar } from '@/avatar/AnimalAvatar';
import { CategoryIcon } from '@/content/CategoryIcon';
import { markIntroShown } from '@/state/intro';
import { useProfile } from '@/state/profile';
import { Button, Screen, tap } from '@/ui/kit';
import { Bob, PopIn, Pulse, SlideIn, Wobble } from '@/ui/motion';
import { A_COLOR, B_COLOR, colors, fonts } from '@/ui/theme';
import { Icon } from '@/ui/Icon';
import { Logo } from '@/ui/Logo';

/**
 * First-launch "how to play". Deliberately few words: each step is a picture
 * plus a short caption. Also reachable later from the "?" on the home screen.
 */

function Step({ n, delay, children, caption, highlight }: { n: number; delay: number; children: React.ReactNode; caption: string; highlight?: boolean }) {
  return (
    <SlideIn from={n % 2 ? 'left' : 'right'} delay={delay} distance={120}>
      <View style={[styles.step, highlight && styles.stepHot]}>
        <View style={[styles.num, highlight && { backgroundColor: colors.ink }]}>
          <Text style={[styles.numText, highlight && { color: colors.gold }]}>{n}</Text>
        </View>
        <View style={styles.visual}>{children}</View>
        <Text style={[styles.caption, highlight && { color: colors.ink }]}>{caption}</Text>
      </View>
    </SlideIn>
  );
}

function Mini({ animal, mood }: { animal: string; color?: string; mood?: 'happy' | 'nervous' | 'drink' | 'neutral' | 'sad' }) {
  return <AnimalAvatar avatar={{ animal }} size={44} mood={mood} />;
}

export default function Welcome() {
  const { update } = useProfile();
  markIntroShown();
  const close = () => {
    tap('medium');
    update({ seenIntro: true });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen scroll>
      <View style={styles.top}>
        <View style={{ width: 44 }} />
        <PopIn style={{ alignItems: 'center' }}>
          <Logo width={92} />
          <Text style={styles.title}>How to play</Text>
        </PopIn>
        <Pressable onPress={close} style={styles.x} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={20} color={colors.white} />
        </Pressable>
      </View>

      <Step n={1} delay={100} caption="Two players face off">
        <Bob amount={4} duration={500}>
          <Mini animal="cat" mood="neutral" />
        </Bob>
        <Text style={styles.vs}>⚔️</Text>
        <Bob amount={4} duration={500} delay={250}>
          <Mini animal="frog" mood="neutral" />
        </Bob>
      </Step>

      <Step n={2} delay={250} caption="The wheel picks a challenge">
        <Wobble deg={25} duration={500}>
          <Text style={styles.big}>🎡</Text>
        </Wobble>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {(['basic', 'physical', 'popculture', 'sports'] as const).map((c) => (
            <CategoryIcon key={c} category={c} size={30} />
          ))}
        </View>
      </Step>

      <Step n={3} delay={400} caption="Everyone else calls the winner">
        <Text style={styles.big}>👆</Text>
        <Bob amount={3} duration={450}>
          <View style={[styles.chip, { backgroundColor: A_COLOR }]}>
            <Mini animal="cat" color="orange" mood="happy" />
          </View>
        </Bob>
        <Text style={styles.small}>or</Text>
        <Bob amount={3} duration={450} delay={200}>
          <View style={[styles.chip, { backgroundColor: B_COLOR }]}>
            <Mini animal="frog" color="green" mood="happy" />
          </View>
        </Bob>
      </Step>

      <Step n={4} delay={550} caption="Back the long shot. If they win: ×3!" highlight>
        <Pulse scale={1.12} duration={350}>
          <Text style={styles.big}>🐶</Text>
        </Pulse>
        <Text style={styles.dogMath}>{'≤33%'}</Text>
        <Text style={styles.dogArrow}>→</Text>
        <Pulse scale={1.18} duration={300}>
          <Text style={styles.x3}>×3</Text>
        </Pulse>
      </Step>

      <Step n={5} delay={700} caption="Most points wins. Party mode: wrong call = drink!">
        <Text style={styles.big}>🏆</Text>
        <Text style={styles.small}>+</Text>
        <Wobble deg={12} duration={400}>
          <Text style={styles.big}>🍺</Text>
        </Wobble>
      </Step>

      <PopIn delay={950}>
        <Button big label="Let's go!" onPress={close} />
      </PopIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.white, fontFamily: fonts.display, fontSize: 32, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 8 },
  x: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xText: { color: colors.white, fontSize: 22, fontFamily: fonts.display },
  step: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  stepHot: { backgroundColor: colors.gold, borderColor: colors.ink, borderWidth: 3, borderBottomWidth: 7 },
  num: { position: 'absolute', top: 10, left: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  numText: { color: colors.ink, fontFamily: fonts.display, fontSize: 16 },
  visual: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50 },
  caption: { color: colors.white, fontFamily: fonts.display, fontSize: 19, textAlign: 'center' },
  vs: { fontSize: 28 },
  big: { fontSize: 38 },
  small: { color: colors.dim, fontSize: 18, fontFamily: fonts.display },
  chip: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.25)' },
  chipText: { color: colors.white, fontFamily: fonts.display, fontSize: 20 },
  dogMath: { color: colors.ink, fontFamily: fonts.display, fontSize: 24 },
  dogArrow: { color: colors.ink, fontFamily: fonts.display, fontSize: 24 },
  x3: { color: '#B3122E', fontFamily: fonts.display, fontSize: 40 },
});
