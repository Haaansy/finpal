import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronIcon } from '@/components/ChevronIcon';
import { LoanDetailModal } from '@/components/LoanDetailModal';
import { LoanRow } from '@/components/LoanRow';
import { useBudget } from '@/context/BudgetContext';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import type { LoanRow as LoanRowType } from '@/db/types';

export default function LoansScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useFinpalTheme();
  const { loans, removeLoan, ready } = useBudget();
  const [selected, setSelected] = useState<LoanRowType | null>(null);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 32 }]}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.backRow}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <ChevronIcon direction="left" size={16} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]}>Loans</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Fixed monthly repayments count as high-priority outflows. Months left counts down when the calendar month
        advances (when you open the app). Tap the + button and choose Loan to add one.
      </Text>

      <Text style={[styles.listTitle, { color: colors.text }]}>Your loans</Text>
      {!ready ? (
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      ) : loans.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>No loans yet. Use + → Loan to add.</Text>
      ) : (
        loans.map((loan) => (
          <Pressable key={loan.id} onPress={() => setSelected(loan)}>
            <LoanRow loan={loan} />
          </Pressable>
        ))
      )}
      <Text style={[styles.hint, { color: colors.textMuted }]}>Tap a loan for details, edit, or delete.</Text>

      <LoanDetailModal
        visible={selected !== null}
        loan={selected}
        onClose={() => setSelected(null)}
        onEdit={(loan) => {
          setSelected(null);
          router.push({ pathname: '/loan-entry', params: { editId: String(loan.id) } });
        }}
        onDelete={async (loan) => {
          await removeLoan(loan.id);
          setSelected(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 13, lineHeight: 18, marginTop: 6, marginBottom: 16 },
  listTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  empty: { fontSize: 14, marginBottom: 8 },
  hint: { fontSize: 12, marginTop: 8 },
});
