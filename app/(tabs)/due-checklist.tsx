import { ChevronIcon } from '@/components/ChevronIcon';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriorityBadge } from '@/components/PriorityBadge';
import type { FinpalColors } from '@/theme/colors';
import { useBudget } from '@/context/BudgetContext';
import { useFinpalDialog } from '@/context/FinpalDialogContext';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import type { LoanRow, TransactionRow } from '@/db/types';
import {
  type ChecklistDueFilter,
  filterChecklistBills,
  isExpenseSettled,
  isLoanChecklistPaidForMonth,
  isLoanOnChecklistFilter,
} from '@/utils/calculations';
import { formatPhp, formatPhpLedger } from '@/utils/currency';
import { calendarMonthKey, formatIsoDateEnPh } from '@/utils/dates';

const FILTER_OPTIONS: { key: ChecklistDueFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'paid', label: 'Paid' },
];

function LoanRepaymentBadge({ colors }: { colors: FinpalColors }) {
  return (
    <View style={[styles.loanBadge, { backgroundColor: `${colors.primary}22`, borderColor: colors.primary }]}>
      <Text style={[styles.loanBadgeText, { color: colors.primary }]}>Loan</Text>
    </View>
  );
}

export default function DueChecklistScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useFinpalTheme();
  const {
    transactions,
    loans,
    removeTransaction,
    markExpensePaid,
    markExpenseUnpaid,
    markLoanRepaymentAcknowledged,
    markLoanRepaymentUnacknowledged,
    ready,
  } = useBudget();
  const dialog = useFinpalDialog();

  const [filter, setFilter] = useState<ChecklistDueFilter>('unpaid');

  const monthYm = calendarMonthKey();

  const filteredBills = useMemo(
    () => filterChecklistBills(transactions, filter),
    [transactions, filter]
  );

  const filteredLoans = useMemo(() => {
    return loans
      .filter((l) => isLoanOnChecklistFilter(l, monthYm, filter))
      .sort((a, b) => {
        const ad = a.repayment_date || '';
        const bd = b.repayment_date || '';
        if (ad !== bd) return ad.localeCompare(bd);
        return a.name.localeCompare(b.name);
      });
  }, [loans, monthYm, filter]);

  const billTotal = useMemo(() => filteredBills.reduce((s, t) => s + t.amount, 0), [filteredBills]);
  const loanMonthlyTotal = useMemo(
    () => filteredLoans.reduce((s, l) => s + l.monthly_repayment, 0),
    [filteredLoans]
  );

  const totalItems = filteredBills.length + filteredLoans.length;
  const hasAny = totalItems > 0;

  const onDeleteBill = async (id: number, label: string) => {
    const ok = await dialog.confirm('Delete bill', `${label} — this cannot be undone.`, {
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) await removeTransaction(id);
  };

  const toggleBill = (item: TransactionRow) => {
    const done = isExpenseSettled(item);
    const p = done ? markExpenseUnpaid(item.id) : markExpensePaid(item.id);
    p.catch((e) => void dialog.alert('Error', e instanceof Error ? e.message : 'Could not update'));
  };

  const toggleLoan = (loan: LoanRow) => {
    const done = isLoanChecklistPaidForMonth(loan, monthYm);
    const p = done ? markLoanRepaymentUnacknowledged(loan.id) : markLoanRepaymentAcknowledged(loan.id);
    p.catch((e) => void dialog.alert('Error', e instanceof Error ? e.message : 'Could not update'));
  };

  const emptyCopy =
    filter === 'paid'
      ? 'No paid checklist items for this filter.'
      : filter === 'unpaid'
        ? `No bills or loan installments to tick for ${monthYm}.`
        : 'No checklist items yet. Add bills with Awaiting payment or loans with due dates.';

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backRow}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ChevronIcon direction="left" size={16} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>Due checklist</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Tap the box to mark paid or unmark. Use the filter to show all, unpaid, or paid items. Long-press a bill to
          delete it.
        </Text>

        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((opt) => {
            const on = filter === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setFilter(opt.key)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: on ? colors.primary : colors.border,
                    backgroundColor: on ? `${colors.primary}22` : colors.surface,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Show ${opt.label}`}>
                <Text style={[styles.filterChipText, { color: on ? colors.primary : colors.text }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {!ready ? (
          <Text style={{ color: colors.textMuted }}>Loading…</Text>
        ) : !hasAny ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FontAwesome name="check-circle" size={40} color={colors.success} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {filter === 'unpaid' ? 'All caught up' : 'Nothing to show'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>{emptyCopy}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.overview, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Quick overview</Text>
              <Text style={[styles.overviewStat, { color: colors.text }]}>
                {totalItems} item{totalItems !== 1 ? 's' : ''} · Bills {formatPhp(billTotal)}
                {filteredLoans.length > 0 ? ` · Loans ${formatPhp(loanMonthlyTotal)}/mo` : ''}
              </Text>
              {filteredBills.length > 0 ? (
                <Text style={[styles.overviewHint, { color: colors.textMuted }]}>
                  Next bill due: {formatIsoDateEnPh(filteredBills[0].due_date || filteredBills[0].date)}
                </Text>
              ) : null}
              {filteredLoans.length > 0 && filteredBills.length === 0 ? (
                <Text style={[styles.overviewHint, { color: colors.textMuted }]}>
                  {filteredLoans.length} loan row{filteredLoans.length !== 1 ? 's' : ''}
                </Text>
              ) : null}
            </View>

            {filteredBills.length > 0 ? (
              <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.listTitle, { color: colors.text }]}>Bills</Text>
                {filteredBills.map((item, index) => (
                  <View
                    key={`b-${item.id}`}
                    style={[
                      styles.row,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}>
                    <Checkbox
                      status={isExpenseSettled(item) ? 'checked' : 'unchecked'}
                      onPress={() => toggleBill(item)}
                      color={colors.primary}
                      uncheckedColor={colors.textMuted}
                    />
                    <Pressable
                      style={styles.rowBody}
                      onLongPress={() =>
                        void onDeleteBill(item.id, item.description || item.category || 'This bill')
                      }>
                      <Text style={[styles.amount, { color: colors.text }]}>
                        {formatPhpLedger(item.amount, 'expense')}
                      </Text>
                      <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={2}>
                        {item.description || item.category || 'Expense'} · Due{' '}
                        {formatIsoDateEnPh(item.due_date || item.date)}
                        {isExpenseSettled(item) ? ` · Paid ${formatIsoDateEnPh(item.date)}` : ''}
                      </Text>
                      <PriorityBadge priority={item.priority ?? 'low'} colors={colors} />
                    </Pressable>
                  </View>
                ))}
                <Text style={[styles.longPressHint, { color: colors.textMuted }]}>
                  Long-press a bill to delete it.
                </Text>
              </View>
            ) : null}

            {filteredLoans.length > 0 ? (
              <View
                style={[
                  styles.listCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    marginTop: filteredBills.length ? 14 : 0,
                  },
                ]}>
                <Text style={[styles.listTitle, { color: colors.text }]}>Loan repayments</Text>
                <Text style={[styles.loanSectionHint, { color: colors.textMuted }]}>
                  {`Recurring: tick monthly. One-off: tick when done (unmark restores it to the checklist).`}
                </Text>
                {filteredLoans.map((loan, index) => {
                  const checked = isLoanChecklistPaidForMonth(loan, monthYm);
                  return (
                    <View
                      key={`l-${loan.id}`}
                      style={[
                        styles.row,
                        index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                      ]}>
                      <Checkbox
                        status={checked ? 'checked' : 'unchecked'}
                        onPress={() => toggleLoan(loan)}
                        color={colors.primary}
                        uncheckedColor={colors.textMuted}
                      />
                      <View style={styles.rowBody}>
                        <Text style={[styles.amount, { color: colors.text }]}>
                          {formatPhp(loan.monthly_repayment)}/mo
                        </Text>
                        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={2}>
                          {loan.name}
                          {loan.repayment_date
                            ? ` · Due ${formatIsoDateEnPh(loan.repayment_date)}`
                            : (loan.is_recurring ?? 1) !== 0
                              ? ` · ${loan.months_left} mo left`
                              : ' · One payment'}
                          {checked && (loan.is_recurring ?? 1) !== 0 ? ' · Confirmed this month' : ''}
                          {checked && (loan.is_recurring ?? 1) === 0 ? ' · Completed' : ''}
                        </Text>
                        <LoanRepaymentBadge colors={colors} />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  sub: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 14, fontWeight: '700' },
  overview: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  overviewLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  overviewStat: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  overviewHint: { fontSize: 13 },
  listCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    paddingTop: 12,
  },
  listTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  loanSectionHint: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  rowBody: { flex: 1, marginLeft: 4, paddingBottom: 8 },
  amount: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 4, marginBottom: 6 },
  longPressHint: { fontSize: 12, marginTop: 8 },
  loanBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  loanBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
