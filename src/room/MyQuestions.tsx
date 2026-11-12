import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_BY_ID, DIFFICULTY_LABEL } from '@/content/categories';
import { CategoryIcon } from '@/content/CategoryIcon';
import type { Question } from '@/game/types';
import { useProfile } from '@/state/profile';
import { tap } from '@/ui/kit';
import { colors, fonts } from '@/ui/theme';

/**
 * A player's own question bank ("My questions"): every question they've written in any
 * lobby. Used in the lobby's add-question sheet and on the account screen.
 *
 * In a lobby (`onToggle` given) each question is a checkbox row: tap it to put it into
 * this lobby, tap again to take it out. Every row also has two explicit actions:
 * "Remove from lobby" (only this lobby; it stays in My questions) and "Delete forever"
 * (gone from My questions on this phone, after a confirm).
 */
export function MyQuestionsList({
  questions,
  onToggle,
  isSelected,
}: {
  questions: Question[];
  onToggle?: (q: Question, select: boolean) => void;
  isSelected?: (q: Question) => boolean;
}) {
  const { removeQuestion } = useProfile();
  const [confirm, setConfirm] = useState<string>();
  const selectable = !!onToggle;
  return (
    <View style={{ gap: 8 }}>
      {questions.map((q) => {
        const cat = CATEGORY_BY_ID[q.category];
        const on = !!isSelected?.(q);
        const body = (
          <View style={[styles.row, selectable && on && styles.rowOn]}>
            {selectable && (
              <View style={[styles.check, on && styles.checkOn]}>{on ? <Text style={styles.checkMark}>✓</Text> : null}</View>
            )}
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <CategoryIcon category={q.category} size={13} />
                <Text style={styles.meta}>
                  {cat?.label} · {DIFFICULTY_LABEL[q.difficulty]}
                  {selectable ? (on ? ' · in this lobby' : ' · not in this lobby') : ''}
                </Text>
              </View>
              <Text style={[styles.prompt, selectable && !on && { color: colors.dim }]}>{q.prompt}</Text>
              {q.answer ? <Text style={styles.answer}>Answer: {q.answer}</Text> : null}

              {confirm === q.id ? (
                <View style={styles.confirm}>
                  <Text style={styles.confirmText}>Delete from My questions for good? This can't be undone.</Text>
                  <View style={styles.actions}>
                    <Pressable accessibilityRole="button" style={styles.action} onPress={() => setConfirm(undefined)}>
                      <Text style={styles.actionText}>Keep it</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.action, styles.actionDanger]}
                      onPress={() => {
                        tap('medium');
                        // Deleting it for good also takes it out of this lobby.
                        if (on) onToggle?.(q, false);
                        removeQuestion(q.id);
                        setConfirm(undefined);
                      }}
                    >
                      <Text style={[styles.actionText, { color: colors.white }]}>Delete forever</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.actions}>
                  {selectable && (
                    <Pressable
                      accessibilityRole="button"
                      style={styles.action}
                      onPress={() => {
                        tap('light');
                        onToggle!(q, !on);
                      }}
                    >
                      <Text style={styles.actionText}>{on ? 'Remove from lobby' : 'Add to lobby'}</Text>
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete forever from My questions"
                    style={styles.action}
                    onPress={() => setConfirm(q.id)}
                  >
                    <Text style={[styles.actionText, { color: colors.red }]}>Delete forever</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        );
        return selectable ? (
          <Pressable
            key={q.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${q.prompt}. ${on ? 'In this lobby' : 'Not in this lobby'}`}
            onPress={() => {
              tap('light');
              onToggle!(q, !on);
            }}
          >
            {body}
          </Pressable>
        ) : (
          <View key={q.id}>{body}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
  },
  rowOn: { borderColor: colors.gold, backgroundColor: 'rgba(255,194,61,0.08)' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  checkMark: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 16 },
  meta: { color: colors.dim, fontFamily: fonts.bodySemi, fontSize: 11 },
  prompt: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
  answer: { color: colors.gold, fontFamily: fonts.bodySemi, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  action: { borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4 },
  actionDanger: { backgroundColor: colors.red, borderColor: colors.red },
  actionText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
  confirm: { gap: 2, marginTop: 4 },
  confirmText: { color: colors.white, fontFamily: fonts.body, fontSize: 12 },
});
