import { ChevronIcon } from '@/components/ChevronIcon';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBudget } from '@/context/BudgetContext';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import type { LoanRow, TransactionRow } from '@/db/types';
import type { FinpalColors } from '@/theme/colors';
import { isExpenseSettled } from '@/utils/calculations';
import {
  loanHasRepaymentInYearMonth,
  loanHasRepaymentOnCalendarDay,
  projectedLoanRepaymentIsos,
} from '@/utils/loanSchedule';
import { formatPhp } from '@/utils/currency';
import { calendarMonthKey, formatIsoDateEnPh, isoFromLocalDate } from '@/utils/dates';

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function isoDay(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useFinpalTheme();
  const { loans, transactions, ready } = useBudget();

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedIso, setSelectedIso] = useState(() => isoFromLocalDate(new Date()));

  const y = visibleMonth.getFullYear();
  const m0 = visibleMonth.getMonth();
  const ymPrefix = calendarMonthKey(visibleMonth);
  const dim = daysInMonth(y, m0);
  const firstWeekday = new Date(y, m0, 1).getDay();

  const markedDates = useMemo(() => {
    const s = new Set<string>();
    for (const l of loans) {
      for (const iso of projectedLoanRepaymentIsos(l)) {
        if (iso.startsWith(ymPrefix)) s.add(iso);
      }
    }
    for (const t of transactions) {
      if (t.type !== 'expense' || isExpenseSettled(t)) continue;
      const key = (t.due_date || t.date).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && key.startsWith(ymPrefix)) {
        s.add(key);
      }
    }
    return s;
  }, [loans, transactions, ymPrefix]);

  const loansThisMonth = useMemo(
    () => loans.filter((l) => l.months_left > 0 && loanHasRepaymentInYearMonth(l, ymPrefix)),
    [loans, ymPrefix]
  );

  const billsThisMonth = useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.type !== 'expense' || isExpenseSettled(t)) return false;
        const key = (t.due_date || t.date).slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(key) && key.startsWith(ymPrefix);
      })
      .sort((a, b) => (a.due_date || a.date).localeCompare(b.due_date || b.date));
  }, [transactions, ymPrefix]);

  const { loansOnDay, billsOnDay } = useMemo(() => {
    const day = selectedIso;
    const ln = loans.filter((l) => l.months_left > 0 && loanHasRepaymentOnCalendarDay(l, day));
    const bl = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        !isExpenseSettled(t) &&
        (t.due_date || t.date).slice(0, 10) === day
    );
    return { loansOnDay: ln, billsOnDay: bl };
  }, [loans, transactions, selectedIso]);

  const todayIso = isoFromLocalDate(new Date());

  const goPrevMonth = () => {
    const next = new Date(y, m0 - 1, 1);
    setVisibleMonth(next);
    setSelectedIso(isoFromLocalDate(new Date(next.getFullYear(), next.getMonth(), 1)));
  };

  const goNextMonth = () => {
    const next = new Date(y, m0 + 1, 1);
    setVisibleMonth(next);
    setSelectedIso(isoFromLocalDate(new Date(next.getFullYear(), next.getMonth(), 1)));
  };

  const monthTitle = visibleMonth.toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  });

  const leadingBlanks = Array.from({ length: firstWeekday }, (_, i) => (
    <View key={`b-${i}`} style={styles.dayCell} />
  ));

  const dayCells = Array.from({ length: dim }, (_, i) => {
    const day = i + 1;
    const iso = isoDay(y, m0, day);
    const marked = markedDates.has(iso);
    const isToday = iso === todayIso;
    const isSelected = iso === selectedIso;
    return (
      <Pressable
        key={iso}
        onPress={() => setSelectedIso(iso)}
        style={[
          styles.dayCell,
          isSelected && { backgroundColor: `${colors.primary}28` },
          isToday && !isSelected && { borderWidth: 1, borderColor: colors.primary },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${day}, ${marked ? 'has due dates, ' : ''}${isSelected ? 'selected' : ''}`}>
        <Text
          style={[
            styles.dayNum,
            { color: colors.text },
            isSelected && { fontWeight: '800' },
          ]}>
          {day}
        </Text>
        <View style={styles.dotRow}>
          {marked ? (
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          ) : (
            <View style={styles.dotPlaceholder} />
          )}
        </View>
      </Pressable>
    );
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>Calendar</Text>
      <Text style={[styles.screenSub, { color: colors.textMuted }]}>
        Loan repayment dates and unpaid bills by due date. Dots mark days with something due.
      </Text>

      {!ready ? (
        <Text style={{ color: colors.textMuted, paddingHorizontal: 20 }}>Loading…</Text>
      ) : (
        <>
          <View style={[styles.calendarPanel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.monthNav}>
              <Pressable
                onPress={goPrevMonth}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Previous month">
                <ChevronIcon direction="left" size={18} color={colors.primary} />
              </Pressable>
              <Text style={[styles.monthTitle, { color: colors.text }]}>{monthTitle}</Text>
              <Pressable
                onPress={goNextMonth}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Next month">
                <ChevronIcon direction="right" size={18} color={colors.primary} />
              </Pressable>
            </View>

            {loansThisMonth.length > 0 || billsThisMonth.length > 0 ? (
              <View style={[styles.loansStrip, { borderTopColor: colors.border }]}>
                {loansThisMonth.length > 0 ? (
                  <>
                    <Text style={[styles.loansStripLabel, { color: colors.textMuted }]}>
                      Loan repayments this month
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {loansThisMonth.map((loan) => {
                        const inMonth = projectedLoanRepaymentIsos(loan).filter((iso) => iso.startsWith(ymPrefix));
                        const dateHint =
                          inMonth.length > 0 ? inMonth.map((iso) => formatIsoDateEnPh(iso)).join(', ') : '—';
                        return (
                          <View
                            key={loan.id}
                            style={[
                              styles.loanChip,
                              { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
                            ]}>
                            <Text style={[styles.loanChipName, { color: colors.text }]} numberOfLines={1}>
                              {loan.name}
                            </Text>
                            <Text style={[styles.loanChipMeta, { color: colors.textMuted }]}>
                              {dateHint} · {formatPhp(loan.monthly_repayment)}/mo
                            </Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : null}
                {billsThisMonth.length > 0 ? (
                  <>
                    <Text
                      style={[
                        styles.loansStripLabel,
                        { color: colors.textMuted, marginTop: loansThisMonth.length > 0 ? 12 : 0 },
                      ]}>
                      Bills due this month
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {billsThisMonth.map((bill) => (
                        <View
                          key={bill.id}
                          style={[
                            styles.loanChip,
                            { borderColor: colors.danger, backgroundColor: `${colors.danger}12` },
                          ]}>
                          <Text style={[styles.loanChipName, { color: colors.text }]} numberOfLines={1}>
                            {bill.description?.trim() || 'Bill'}
                          </Text>
                          <Text style={[styles.loanChipMeta, { color: colors.textMuted }]}>
                            {formatIsoDateEnPh(bill.due_date || bill.date)} · {formatPhp(bill.amount)}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </>
                ) : null}
              </View>
            ) : null}

            <View style={styles.weekRow}>
              {WEEK_LABELS.map((w) => (
                <Text key={w} style={[styles.weekLabel, { color: colors.textMuted }]}>
                  {w}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>{leadingBlanks}{dayCells}</View>
          </View>

          <View
            style={[
              styles.duePanel,
              { borderTopColor: colors.border, backgroundColor: colors.background },
            ]}>
            <Text style={[styles.dueHeading, { color: colors.text }]}>Due dates</Text>
            <Text style={[styles.dueSub, { color: colors.textMuted }]}>
              {formatIsoDateEnPh(selectedIso)}
            </Text>
            <ScrollView
              style={styles.dueScroll}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              showsVerticalScrollIndicator={false}>
              {loansOnDay.length === 0 && billsOnDay.length === 0 ? (
                <Text style={[styles.emptyDue, { color: colors.textMuted }]}>
                  Nothing due on this date.
                </Text>
              ) : (
                <>
                  {loansOnDay.map((loan) => (
                    <DueLoanRow key={`l-${loan.id}`} loan={loan} colors={colors} />
                  ))}
                  {billsOnDay.map((bill) => (
                    <DueBillRow key={`b-${bill.id}`} bill={bill} colors={colors} />
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

function DueLoanRow({ loan, colors }: { loan: LoanRow; colors: FinpalColors }) {
  return (
    <View style={[styles.dueCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.badge, { backgroundColor: `${colors.primary}22`, borderColor: colors.primary }]}>
        <Text style={[styles.badgeText, { color: colors.primary }]}>Loan</Text>
      </View>
      <Text style={[styles.dueTitle, { color: colors.text }]}>{loan.name}</Text>
      <Text style={[styles.dueMeta, { color: colors.textMuted }]}>
        {formatPhp(loan.monthly_repayment)}/mo · {loan.months_left} mo left
      </Text>
    </View>
  );
}

function DueBillRow({ bill, colors }: { bill: TransactionRow; colors: FinpalColors }) {
  return (
    <View style={[styles.dueCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.badge, { backgroundColor: `${colors.danger}22`, borderColor: colors.danger }]}>
        <Text style={[styles.badgeText, { color: colors.danger }]}>Bill</Text>
      </View>
      <Text style={[styles.dueTitle, { color: colors.text }]}>
        {bill.description?.trim() || 'Expense'}
      </Text>
      <Text style={[styles.dueMeta, { color: colors.textMuted }]}>
        {formatPhp(bill.amount)}
        {bill.priority ? ` · ${bill.priority} priority` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenTitle: { fontSize: 22, fontWeight: '800', paddingHorizontal: 20, marginBottom: 4 },
  screenSub: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, marginBottom: 12 },
  calendarPanel: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthTitle: { fontSize: 17, fontWeight: '700' },
  loansStrip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 12,
  },
  loansStripLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  loanChip: {
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 200,
  },
  loanChipName: { fontSize: 14, fontWeight: '700' },
  loanChipMeta: { fontSize: 11, marginTop: 2 },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  dayCell: {
    width: '14.2857%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingTop: 4,
  },
  dayNum: { fontSize: 15, fontWeight: '600' },
  dotRow: { height: 8, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotPlaceholder: { width: 6, height: 6 },
  duePanel: {
    flex: 1,
    marginTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  dueHeading: { fontSize: 18, fontWeight: '800' },
  dueSub: { fontSize: 13, marginTop: 4, marginBottom: 12 },
  dueScroll: { flex: 1 },
  emptyDue: { fontSize: 14, lineHeight: 20 },
  dueCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  dueTitle: { fontSize: 16, fontWeight: '700' },
  dueMeta: { fontSize: 13, marginTop: 4 },
});
