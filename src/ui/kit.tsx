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
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export const theme = {
  bg: '#1A1033',
  bg2: '#25174A',
  card: '#2F1F5C',
  cardHi: '#3B2873',
  text: '#FFFFFF',
  dim: '#B9AEDB',
  accent: '#FFD23F',
  pink: '#FF4F9A',
  blue: '#3BC9FF',
  green: '#2EDB8B',
  red: '#FF4D5E',
  ink: '#2B2340',
  radius: 18,
};

export const A_COLOR = '#FF4F9A';
export const B_COLOR = '#3BC9FF';

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
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, style]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'a' | 'b';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  small,
  icon,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  icon?: string;
}) {
  const bg = {
    primary: theme.accent,
    secondary: theme.cardHi,
    ghost: 'transparent',
    danger: theme.red,
    a: A_COLOR,
    b: B_COLOR,
  }[variant];
  const fg = variant === 'primary' || variant === 'b' ? theme.ink : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (disabled || loading) return;
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        variant === 'ghost' && { borderWidth: 2, borderColor: theme.cardHi },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, small && { fontSize: 15 }, { color: fg }]}>
          {icon ? `${icon}  ` : ''}
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
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

export function Pill({ label, color = theme.cardHi, textColor = theme.text }: { label: string; color?: string; textColor?: string }) {
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
      <View style={[styles.switch, value && !locked && { backgroundColor: theme.green }]}>
        <View style={[styles.knob, value && !locked && { alignSelf: 'flex-end' }]} />
      </View>
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
            style={[styles.segmentItem, active && { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.segmentText, active && { color: theme.ink }]}>
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
  safe: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  button: {
    minHeight: 56,
    borderRadius: theme.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  buttonSmall: { minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderBottomWidth: 3 },
  buttonText: { fontSize: 18, fontWeight: '800' },
  card: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 16, gap: 10 },
  h1: { color: theme.text, fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  h2: { color: theme.text, fontSize: 22, fontWeight: '800' },
  body: { color: theme.text, fontSize: 16, lineHeight: 22 },
  dim: { color: theme.dim, fontSize: 15, lineHeight: 20 },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, alignSelf: 'flex-start' },
  pillText: { fontSize: 13, fontWeight: '800' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  switch: { width: 52, height: 30, borderRadius: 15, backgroundColor: theme.cardHi, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  segment: { flexDirection: 'row', backgroundColor: theme.bg2, borderRadius: 14, padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentText: { color: theme.text, fontWeight: '800', fontSize: 15 },
});
