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
import * as Haptics from 'expo-haptics';
import { Background } from './Background';
import { A_COLOR as A, B_COLOR as B, colors, fonts } from './theme';
import { bounce } from '@/ui/motion';

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
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  tint?: 'red' | 'green' | 'party';
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBottom }}>
      <Background tint={tint} />
      <SafeAreaView style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.content, style]} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }, style]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'a' | 'b' | 'green' | 'cyan';

const VARIANTS: Record<Variant, { face: string; lip: string; text: string }> = {
  primary: { face: colors.gold, lip: colors.goldLip, text: colors.ink },
  secondary: { face: colors.violet, lip: colors.violetLip, text: colors.white },
  ghost: { face: 'transparent', lip: 'transparent', text: colors.white },
  danger: { face: colors.red, lip: colors.redLip, text: colors.white },
  a: { face: colors.pink, lip: colors.pinkLip, text: colors.white },
  b: { face: colors.cyan, lip: colors.cyanLip, text: colors.ink },
  green: { face: colors.green, lip: colors.greenLip, text: colors.ink },
  cyan: { face: colors.cyan, lip: colors.cyanLip, text: colors.ink },
};

const LIP = 6;

/** Chunky 3D game button: the face sinks onto its darker lip when pressed. */
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
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  icon?: string;
  subtitle?: string;
  big?: boolean;
}) {
  const v = VARIANTS[variant];
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * (LIP - 1) }] }));
  const ghost = variant === 'ghost';
  const lip = small ? 4 : LIP;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => {
        if (disabled) return;
        press.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        press.value = bounce(0);
      }}
      onPress={() => {
        if (disabled || loading) return;
        tap('medium');
        onPress?.();
      }}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
    >
      <View style={[styles.lip, { backgroundColor: v.lip, borderRadius: small ? 16 : 22, paddingBottom: ghost ? 0 : lip }]}>
        <Animated.View
          style={[
            styles.face,
            small && styles.faceSmall,
            big && styles.faceBig,
            { backgroundColor: v.face, borderRadius: small ? 16 : 22 },
            ghost && styles.ghost,
            faceStyle,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={v.text} />
          ) : (
            <>
              <Text style={[styles.buttonText, small && { fontSize: 16 }, big && { fontSize: 28 }, { color: v.text }]}>
                {icon ? `${icon} ` : ''}
                {label}
              </Text>
              {subtitle ? <Text style={[styles.subtitle, { color: v.text }]}>{subtitle}</Text> : null}
            </>
          )}
          {!ghost && <View style={styles.shine} pointerEvents="none" />}
        </Animated.View>
      </View>
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

export function Pill({ label, color = 'rgba(255,255,255,0.18)', textColor = colors.white }: { label: string; color?: string; textColor?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
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
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  locked?: boolean;
  hint?: string;
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
        <Text style={styles.body}>
          {locked ? '🔒 ' : ''}
          {label}
        </Text>
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
  options: { value: T; label: string }[];
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
          >
            <Text style={[styles.segmentText, active && { color: colors.ink }]}>
              {locked && !active ? '🔒 ' : ''}
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  lip: {},
  face: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    overflow: 'hidden',
    transform: [{ translateY: 0 }],
  },
  faceSmall: { minHeight: 42, paddingHorizontal: 14, paddingVertical: 6 },
  faceBig: { minHeight: 84 },
  ghost: { borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)' },
  shine: { position: 'absolute', top: 4, left: 12, right: 12, height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.28)' },
  buttonText: { fontSize: 22, fontFamily: fonts.display, letterSpacing: 0.3 },
  subtitle: { fontSize: 14, fontFamily: fonts.bodySemi, opacity: 0.85, marginTop: 2, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 16, gap: 10, borderWidth: 1.5, borderColor: colors.cardBorder },
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
    fontSize: 38,
    fontFamily: fonts.display,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  h2: { color: colors.white, fontSize: 24, fontFamily: fonts.display },
  body: { color: colors.white, fontSize: 17, lineHeight: 23, fontFamily: fonts.bodySemi },
  dim: { color: colors.dim, fontSize: 15, lineHeight: 20, fontFamily: fonts.body },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, alignSelf: 'flex-start' },
  pillText: { fontSize: 14, fontFamily: fonts.display, letterSpacing: 0.3 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  switch: { width: 54, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(20,4,40,0.45)', borderRadius: 16, padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.gold },
  segmentText: { color: colors.white, fontFamily: fonts.display, fontSize: 16 },
});
