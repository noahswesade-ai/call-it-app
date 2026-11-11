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
 * lobby. Used in the lobby's add-question sheet (tap to add) and on the account screen.
 */
export function MyQuestionsList({
  questions,
  onAdd,
  isAdded,
}: {
  questions: Question[];
  onAdd?: (q: Question) => void;
  isAdded?: (q: Question) => boolean;
}) {
  const { removeQuestion } = useProfile();
  const [confirm, setConfirm] = useState<string>();
  return (
    <View style={{ gap: 6 }}>
      {questions.map((q) => {
        const cat = CATEGORY_BY_ID[q.category];
        const added = isAdded?.(q);
        return (
          <View key={q.id} style={[styles.row, { borderLeftColor: cat?.color ?? colors.gold }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <CategoryIcon category={q.category} size={14} />
                <Text style={styles.meta}>
                  {cat?.label} · {DIFFICULTY_LABEL[q.difficulty]}
                </Text>
              </View>
              <Text style={styles.prompt}>{q.prompt}</Text>
              {q.answer ? <Text style={styles.answer}>Answer: {q.answer}</Text> : null}
            </View>
            {confirm === q.id ? (
              <View style={{ gap: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.btn, { backgroundColor: colors.red }]}
                  onPress={() => {
                    tap('medium');
                    removeQuestion(q.id);
                    setConfirm(undefined);
                  }}
                >
                  <Text style={styles.btnText}>Delete</Text>
                </Pressable>
                <Pressable accessibilityRole="button" style={styles.btn} onPress={() => setConfirm(undefined)}>
                  <Text style={styles.btnText}>Keep</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 4, alignItems: 'flex-end' }}>
                {onAdd && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={added}
                    style={[styles.btn, { backgroundColor: added ? 'rgba(255,255,255,0.12)' : colors.green }]}
                    onPress={() => onAdd(q)}
                    accessibilityLabel={added ? 'Already in this lobby' : 'Add to this lobby'}
                  >
                    <Text style={[styles.btnText, !added && { color: colors.ink }]}>{added ? '✓ In lobby' : '+ Add'}</Text>
                  </Pressable>
                )}
                <Pressable accessibilityRole="button" style={styles.trash} onPress={() => setConfirm(q.id)} accessibilityLabel="Remove from My questions">
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderLeftWidth: 5,
    padding: 10,
  },
  meta: { color: colors.dim, fontFamily: fonts.bodyBold, fontSize: 11 },
  prompt: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 15 },
  answer: { color: colors.gold, fontFamily: fonts.bodySemi, fontSize: 12 },
  btn: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  btnText: { color: colors.white, fontFamily: fonts.display, fontSize: 13 },
  trash: { padding: 4 },
});
