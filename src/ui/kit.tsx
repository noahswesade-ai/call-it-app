import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Haptics } from '@/ui/prefs';
import { Background, type Tint } from './Background';
import { useScreenSize } from './screenSize';
import { A_COLOR as A, B_COLOR as B, colors, fonts } from './theme';
import { bounce, Pulse } from '@/ui/motion';
import { Icon, type IconName } from './Icon';

export const A_COLOR = A;
export const B_COLOR = B;

/** Legacy names used across screens, mapped onto the new palette. */
export const theme = {
  bg: colors.bgBottom,
  bg2: 'rgba(20,4,40,0.45)',
  card: colors.card,
  cardHi: 'rgba(255,255,255,0.18)',
  text: colors.white,
  dim: colors.dim,
  accent: colors.gold,
  pink: colors.pink,
  blue: colors.cyan,
  green: colors.green,
  red: colors.red,
  ink: colors.ink,
  radius: 22,
};

export function tap(style: 'light' | 'medium' | 'heavy' = 'light') {
  const map = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
  };
  Haptics.impactAsync(map[style]).catch(() => {});
}

export function Screen({
  children,
  scroll = false,
  style,
  tint,
  footer,
  overlay,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  tint?: Tint;
  /** Pinned to the bottom of the screen above the content (e.g. the timer bar). */
  footer?: React.ReactNode;
  /** Full-screen layer drawn above everything (e.g. the Underdog takeover). */
  overlay?: React.ReactNode;
}) {
  const pad = footer ? { paddingBottom: 90 } : null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBottom }}>
      <Background tint={tint} />
      <SafeAreaView style={{ flex: 1 }}>
        {scroll ? (
          <AutoFit style={[style, pad]}>{children}</AutoFit>
        ) : (
          <View style={[styles.content, { flex: 1 }, style, pad]}>{children}</View>
        )}
        {footer ? (
          <View style={styles.footer} pointerEvents="box-none">
            {footer}
          </View>
        ) : null}
      </SafeAreaView>
      {overlay ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {overlay}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Lays content out at full phone height and, if it's taller than the screen, scales
 * it down so everything is visible at once. No page ever needs scrolling.
 * (Layout height is unaffected by transforms, so measuring the inner view gives
 * the natural height even while it's scaled.)
 */
export function AutoFit({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  // Start from an estimate so the screen draws instantly; the real height arrives via onLayout.
  const estimate = useScreenSize().height - 90;
  const [avail, setAvail] = React.useState(estimate);
  const [natural, setNatural] = React.useState(0);
  const scale = avail > 0 && natural > avail + 1 ? avail / natural : 1;
  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => setAvail(e.nativeEvent.layout.height)}>
      {avail > 0 && (
        <View
          style={[
            styles.content,
            { minHeight: avail, position: 'absolute', top: 0, left: 0, right: 0, transform: [{ scale }], transformOrigin: 'top' },
            style,
          ]}
          onLayout={(e) => setNatural(e.nativeEvent.layout.height)}
        >
          {children}
        </View>
      )}
    </View>
  );
}

/**
 * Hover (mouse) / press-and-hold (finger) feedback for large buttons and cards: the
 * element grows slightly and a ring outlines it, so it's clear what you're touching.
 * Not used on small controls (?, home, avatar, chips).
 */
export function useLift(enabled = true) {
  const lift = useSharedValue(0);
  const state = React.useRef({ hover: false, press: false });
  const set = (k: 'hover' | 'press', v: boolean) => {
    state.current[k] = v;
    const on = enabled && (state.current.hover || state.current.press);
    lift.value = withTiming(on ? 1 : 0, { duration: on ? 140 : 200 });
  };
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.035 * lift.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: lift.value }));
  return {
    scaleStyle,
    ringStyle,
    handlers: {
      onHoverIn: () => set('hover', true),
      onHoverOut: () => set('hover', false),
      onPressIn: () => set('press', true),
      onPressOut: () => set('press', false),
    },
  };
}

/** The outline ring drawn around a lifted element (place inside a relatively positioned wrapper). */
export function LiftRing({ style, radius = 16, color = colors.white }: { style: ReturnType<typeof useLift>['ringStyle']; radius?: number; color?: string }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: radius + 4, borderWidth: 2.5, borderColor: color }, style]}
    />
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'a' | 'b' | 'green' | 'cyan' | 'party';

const VARIANTS: Record<Variant, { face: string; lip: string; text: string }> = {
  primary: { face: colors.gold, lip: colors.goldLip, text: colors.ink },
  secondary: { face: colors.surfaceHi, lip: '#250A45', text: colors.white },
  ghost: { face: 'transparent', lip: 'transparent', text: colors.white },
  danger: { face: colors.red, lip: colors.redLip, text: colors.white },
  a: { face: colors.pink, lip: colors.pinkLip, text: colors.white },
  b: { face: colors.cyan, lip: colors.cyanLip, text: colors.ink },
  green: { face: colors.green, lip: colors.greenLip, text: colors.ink },
  cyan: { face: colors.cyan, lip: colors.cyanLip, text: colors.ink },
  // Party mode: a dark pink that leans purple, matching the logo's purple.
  party: { face: '#9C2A7E', lip: '#5A0D45', text: colors.white },
};

const LIP = 6;

/** Game button with a slim darker lip: the face sinks onto it when pressed. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  small,
  icon,
  subtitle,
  big,
  sticker,
}: {
  label: string;
  /** A small tilted promo sticker on the button's top-right corner (e.g. "1 FREE GAME"). */
  sticker?: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  icon?: IconName;
  subtitle?: string;
  big?: boolean;
}) {
  const v = VARIANTS[variant];
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * (LIP - 1) }] }));
  const ghost = variant === 'ghost';
  const lip = small ? 4 : LIP;
  const radius = small ? 12 : 16;
  const lifts = !small && !disabled;
  const { scaleStyle, ringStyle, handlers } = useLift(lifts);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onHoverIn={handlers.onHoverIn}
      onHoverOut={handlers.onHoverOut}
      onPressIn={() => {
        if (disabled) return;
        handlers.onPressIn();
        press.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        handlers.onPressOut();
        press.value = bounce(0);
      }}
      onPress={() => {
        if (disabled || loading) return;
        tap('medium');
        onPress?.();
      }}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
    >
      <Animated.View style={scaleStyle}>
        {lifts && <LiftRing style={ringStyle} radius={radius} color={variant === 'primary' ? colors.white : colors.gold} />}
        <View style={[styles.lip, !ghost && styles.lipShadow, { backgroundColor: v.lip, borderRadius: radius, paddingBottom: ghost ? 0 : lip }]}>
          <Animated.View
            style={[
              styles.face,
              small && styles.faceSmall,
              big && styles.faceBig,
              { backgroundColor: v.face, borderRadius: radius },
              ghost && styles.ghost,
              faceStyle,
            ]}
          >
            {!ghost && (
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
                style={[styles.sheen, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
              />
            )}
            {loading ? (
              <ActivityIndicator color={v.text} />
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: small ? 6 : 8 }}>
                  {icon ? <Icon name={icon} size={small ? 16 : big ? 24 : 20} color={v.text} strokeWidth={2.4} /> : null}
                  <Text style={[styles.buttonText, small && { fontSize: 15 }, big && { fontSize: 24 }, { color: v.text }]}>{label}</Text>
                </View>
                {subtitle ? <Text style={[styles.subtitle, { color: v.text }]}>{subtitle}</Text> : null}
              </>
            )}
          </Animated.View>
        </View>
        {sticker ? (
          <View pointerEvents="none" style={styles.stickerWrap}>
            <Pulse scale={1.08} duration={700}>
              <View style={styles.sticker}>
                <Text style={styles.stickerText}>{sticker}</Text>
              </View>
            </Pulse>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export function Card({ children, style, white }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; white?: boolean }) {
  return <View style={[styles.card, white && styles.cardWhite, style]}>{children}</View>;
}

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Dim({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.dim, style]}>{children}</Text>;
}

export function Pill({
  label,
  color = 'rgba(255,255,255,0.18)',
  textColor = colors.white,
  icon,
}: {
  label: string;
  color?: string;
  textColor?: string;
  icon?: IconName;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: color, flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
      {icon ? <Icon name={icon} size={13} color={textColor} strokeWidth={2.6} /> : null}
      <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>;
}

export function Toggle({
  label,
  value,
  onChange,
  locked,
  hint,
  icon,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  locked?: boolean;
  hint?: string;
  icon?: IconName;
}) {
  const x = useSharedValue(value && !locked ? 1 : 0);
  React.useEffect(() => {
    x.value = bounce(value && !locked ? 1 : 0);
  }, [value, locked, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 24 }] }));
  const track = useAnimatedStyle(() => ({ backgroundColor: x.value > 0.5 ? colors.green : 'rgba(255,255,255,0.2)' }));
  return (
    <Pressable
      onPress={() => {
        tap();
        onChange(!value);
      }}
      style={styles.toggleRow}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {locked ? <Icon name="lock" size={15} color={colors.gold} /> : null}
          {icon ? <Icon name={icon} size={17} color={colors.dim} /> : null}
          <Text style={[styles.body, { flexShrink: 1 }]}>{label}</Text>
        </View>
        {hint ? <Text style={[styles.dim, { fontSize: 13 }]}>{hint}</Text> : null}
      </View>
      <Animated.View style={[styles.switch, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  locked,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  locked?: boolean;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.segmentItem, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {locked && !active ? <Icon name="lock" size={13} color={colors.white} /> : null}
              {o.icon ? <Icon name={o.icon} size={14} color={active ? colors.ink : colors.white} /> : null}
              <Text style={[styles.segmentText, active && { color: colors.ink }]}>{o.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { position: 'absolute', left: 0, right: 0, bottom: 22, paddingHorizontal: 18, maxWidth: 560, width: '100%', alignSelf: 'center' },
  content: { padding: 18, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  lip: {},
  stickerWrap: { position: 'absolute', top: -12, right: -6, transform: [{ rotate: '8deg' }] },
  sticker: {
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  stickerText: { color: colors.ink, fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.3 },
  // Subtle depth: a soft shadow under the button, a slim darker lip, and a light top sheen.
  lipShadow: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  sheen: { position: 'absolute', left: 0, right: 0, top: 0, height: '55%' },
  face: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    overflow: 'hidden',
    transform: [{ translateY: 0 }],
  },
  faceSmall: { minHeight: 40, paddingHorizontal: 14, paddingVertical: 6 },
  faceBig: { minHeight: 72 },
  ghost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)' },
  buttonText: { fontSize: 18, fontFamily: fonts.display, letterSpacing: 0 },
  subtitle: { fontSize: 14, fontFamily: fonts.bodySemi, opacity: 0.85, marginTop: 2, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.cardBorder },
  cardWhite: {
    backgroundColor: colors.white,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
  },
  h1: {
    color: colors.white,
    fontSize: 32,
    fontFamily: fonts.display,
    letterSpacing: -0.5,
  },
  h2: { color: colors.white, fontSize: 20, fontFamily: fonts.display, letterSpacing: -0.2 },
  body: { color: colors.white, fontSize: 16, lineHeight: 22, fontFamily: fonts.bodySemi },
  dim: { color: colors.dim, fontSize: 15, lineHeight: 20, fontFamily: fonts.body },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, alignSelf: 'flex-start' },
  pillText: { fontSize: 13, fontFamily: fonts.bodyBold, letterSpacing: 0.2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  switch: { width: 54, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 3, gap: 3 },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.white },
  segmentText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 14 },
});
