import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronIcon } from "@/components/ChevronIcon";
import { ComputationInfoCollapsible } from "@/components/ComputationInfoCollapsible";
import { LoanRow } from "@/components/LoanRow";
import { SafeToSpendCard } from "@/components/SafeToSpendCard";
import { SavingsProgress } from "@/components/SavingsProgress";
import { useBudget } from "@/context/BudgetContext";
import { useFinpalTheme } from "@/context/FinpalThemeContext";
import { buildCalculationsSnapshot } from "@/hooks/useCalculations";
import { useDueDatesOverview } from "@/hooks/useDueDatesOverview";
import {
  computeFunds,
  disposableBudgetFromFunds,
  getBudgetPeriodRange,
  getPreviousBudgetPeriodRange,
} from "@/utils/calculations";
import { formatPhp } from "@/utils/currency";
import { formatYearMonthHeading, parseIsoToDate } from "@/utils/dates";

const MIN_YEAR = 2000;
const FUTURE_MONTHS_AHEAD = 24;

function maxCalendarMonthTotal(): number {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth() + FUTURE_MONTHS_AHEAD;
}

function clampCalendarMonthTotal(total: number): { y: number; m: number } {
  const min = MIN_YEAR * 12;
  const max = maxCalendarMonthTotal();
  const t = Math.min(Math.max(total, min), max);
  return { y: Math.floor(t / 12), m: t % 12 };
}

function addCalendarMonths(
  y: number,
  m: number,
  delta: number,
): { y: number; m: number } {
  return clampCalendarMonthTotal(y * 12 + m + delta);
}

export default function PastOverviewScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useFinpalTheme();
  const { transactions, loans, settings, ready, safeToSpendMoves } = useBudget();
  const dueDatesOverview = useDueDatesOverview();

  const [selYM, setSelYM] = useState<{ y: number; m: number } | null>(null);

  useEffect(() => {
    if (!ready) return;
    setSelYM((prev) => {
      if (prev) return prev;
      const prevRange = getPreviousBudgetPeriodRange(
        settings.budgetPeriodEndDay,
      );
      const end = parseIsoToDate(prevRange.end);
      if (!end)
        return {
          y: new Date().getFullYear(),
          m: Math.max(0, new Date().getMonth() - 1),
        };
      return { y: end.getFullYear(), m: end.getMonth() };
    });
  }, [ready, settings.budgetPeriodEndDay]);

  const anchorDate = useMemo(() => {
    if (!selYM) return null;
    return new Date(selYM.y, selYM.m, 15);
  }, [selYM]);

  const metrics = useMemo(() => {
    if (!anchorDate) return null;
    return buildCalculationsSnapshot(
      transactions,
      loans,
      safeToSpendMoves,
      settings.budgetPeriodEndDay,
      settings.budgetRates,
      anchorDate,
      { carryoverSafeToSpend: settings.carryoverSafeToSpend },
    );
  }, [
    anchorDate,
    transactions,
    loans,
    safeToSpendMoves,
    settings.budgetPeriodEndDay,
    settings.budgetRates,
    settings.carryoverSafeToSpend,
  ]);

  const currentRange = useMemo(
    () => getBudgetPeriodRange(settings.budgetPeriodEndDay, new Date()),
    [settings.budgetPeriodEndDay],
  );
  const currentMetrics = useMemo(() => {
    if (!ready) return null;
    return buildCalculationsSnapshot(
      transactions,
      loans,
      safeToSpendMoves,
      settings.budgetPeriodEndDay,
      settings.budgetRates,
      new Date(),
      { carryoverSafeToSpend: settings.carryoverSafeToSpend },
    );
  }, [
    ready,
    transactions,
    loans,
    safeToSpendMoves,
    settings.budgetPeriodEndDay,
    settings.budgetRates,
    settings.carryoverSafeToSpend,
  ]);
  const isCurrentPeriod = metrics
    ? metrics.range.start === currentRange.start &&
      metrics.range.end === currentRange.end
    : false;

  const activeLoans = loans.filter((l) => l.months_left > 0);

  if (!ready || selYM === null || metrics === null) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  let s = metrics;
  let projectedCarryoverIncome = 0;
  if (
    settings.carryoverSafeToSpend &&
    currentMetrics &&
    metrics.range.start > currentRange.start
  ) {
    // If the user is previewing a future period, show a projection for the immediate next period:
    // carry over whatever is currently unspent safe-to-spend in the current period.
    const end = parseIsoToDate(currentRange.end);
    if (end) {
      const dayAfterEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
      const nextRange = getBudgetPeriodRange(settings.budgetPeriodEndDay, dayAfterEnd);
      if (metrics.range.start === nextRange.start && metrics.range.end === nextRange.end) {
        projectedCarryoverIncome = Math.max(0, currentMetrics.safeToSpend);
        if (projectedCarryoverIncome > 0) {
          const incomeMonth = s.incomeMonth + projectedCarryoverIncome;
          const funds = computeFunds(incomeMonth, s.highPriMonth);
          const disposableBudget = disposableBudgetFromFunds(funds, settings.budgetRates);
          const safeToSpend = disposableBudget - s.lowPriMonth;
          s = { ...s, incomeMonth, funds, disposableBudget, safeToSpend };
        }
      }
    }
  }
  const monthLabel = formatYearMonthHeading(
    `${selYM.y}-${String(selYM.m + 1).padStart(2, "0")}`,
  );
  const atMin = selYM.y * 12 + selYM.m <= MIN_YEAR * 12;
  const atMax = selYM.y * 12 + selYM.m >= maxCalendarMonthTotal();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: 24 },
      ]}
    >
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronIcon direction="left" size={18} color={colors.primary} />
        <Text style={[styles.backLabel, { color: colors.primary }]}>Back</Text>
      </Pressable>

      <Text style={[styles.heading, { color: colors.text }]}>
        Period overview
      </Text>
      <Text style={[styles.tagline, { color: colors.textMuted }]}>
        Same layout as Home for the period containing {monthLabel}.
      </Text>

      <Text style={[styles.selectorLabel, { color: colors.textMuted }]}>
        Month & year
      </Text>
      <View
        style={[
          styles.selectorCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.selectorRow}>
          <Pressable
            onPress={() =>
              setSelYM((p) => (p ? addCalendarMonths(p.y, p.m, -1) : p))
            }
            disabled={atMin}
            style={({ pressed }) => [
              styles.selectorIconBtn,
              { borderColor: colors.border },
              atMin && styles.selectorIconBtnDisabled,
              pressed && !atMin && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <ChevronIcon
              direction="left"
              size={22}
              color={atMin ? colors.textMuted : colors.primary}
            />
          </Pressable>
          <Text style={[styles.selectorMonth, { color: colors.text }]}>
            {monthLabel}
          </Text>
          <Pressable
            onPress={() =>
              setSelYM((p) => (p ? addCalendarMonths(p.y, p.m, 1) : p))
            }
            disabled={atMax}
            style={({ pressed }) => [
              styles.selectorIconBtn,
              { borderColor: colors.border },
              atMax && styles.selectorIconBtnDisabled,
              pressed && !atMax && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <ChevronIcon
              direction="right"
              size={22}
              color={atMax ? colors.textMuted : colors.primary}
            />
          </Pressable>
        </View>
        <View style={[styles.yearRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.yearRowLabel, { color: colors.textMuted }]}>
            Year
          </Text>
          <View style={styles.yearStepper}>
            <Pressable
              onPress={() =>
                setSelYM((p) => (p ? addCalendarMonths(p.y, p.m, -12) : p))
              }
              disabled={atMin}
              style={({ pressed }) => [
                styles.selectorIconBtn,
                styles.yearStepBtn,
                { borderColor: colors.border },
                atMin && styles.selectorIconBtnDisabled,
                pressed && !atMin && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous year"
            >
              <ChevronIcon
                direction="left"
                size={20}
                color={atMin ? colors.textMuted : colors.primary}
              />
            </Pressable>
            <Text style={[styles.yearValue, { color: colors.text }]}>
              {selYM.y}
            </Text>
            <Pressable
              onPress={() =>
                setSelYM((p) => (p ? addCalendarMonths(p.y, p.m, 12) : p))
              }
              disabled={atMax}
              style={({ pressed }) => [
                styles.selectorIconBtn,
                styles.yearStepBtn,
                { borderColor: colors.border },
                atMax && styles.selectorIconBtnDisabled,
                pressed && !atMax && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next year"
            >
              <ChevronIcon
                direction="right"
                size={20}
                color={atMax ? colors.textMuted : colors.primary}
              />
            </Pressable>
          </View>
        </View>
      </View>

      {isCurrentPeriod ? (
        <Text
          style={[
            styles.currentBadge,
            { color: colors.primary, borderColor: colors.primary },
          ]}
        >
          Current budget period
        </Text>
      ) : null}

      <SafeToSpendCard
        amount={Math.max(0, s.safeToSpend)}
        periodHint={`Ends ${s.periodEndFormatted} · ${s.periodRangeFormatted}`}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Overview
      </Text>
      <View
        style={[
          styles.overviewCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.overviewBlock}>
          <View style={styles.overviewBlockHead}>
            <FontAwesome
              name="calendar"
              size={16}
              color={colors.primary}
              style={styles.overviewBlockIcon}
            />
            <Text style={[styles.overviewBlockTitle, { color: colors.text }]}>
              Due dates
            </Text>
          </View>
          <Text style={[styles.overviewBody, { color: colors.textMuted }]}>
            {dueDatesOverview}
          </Text>
        </View>

        <View
          style={[styles.overviewDivider, { backgroundColor: colors.border }]}
        />

        <View style={styles.overviewBlock}>
          <View style={styles.overviewBlockHead}>
            <FontAwesome
              name="money"
              size={16}
              color={colors.primary}
              style={styles.overviewBlockIcon}
            />
            <Text style={[styles.overviewBlockTitle, { color: colors.text }]}>
              Income
            </Text>
          </View>
          <Text style={[styles.overviewValue, { color: colors.text }]}>
            {formatPhp(s.incomeMonth)}
          </Text>
          <Text style={[styles.overviewMeta, { color: colors.textMuted }]}>
            Settled income in the selected period
          </Text>
          {projectedCarryoverIncome > 0 ? (
            <Text style={[styles.overviewDetail, { color: colors.textMuted }]}>
              Includes projected carryover: {formatPhp(projectedCarryoverIncome)}
            </Text>
          ) : null}
        </View>

        <View
          style={[styles.overviewDivider, { backgroundColor: colors.border }]}
        />

        <View style={styles.overviewBlock}>
          <View style={styles.overviewBlockHead}>
            <FontAwesome
              name="flag"
              size={16}
              color={colors.danger}
              style={styles.overviewBlockIcon}
            />
            <Text style={[styles.overviewBlockTitle, { color: colors.text }]}>
              High Priority Expense
            </Text>
          </View>
          <Text style={[styles.overviewValue, { color: colors.text }]}>
            {formatPhp(s.highPriMonth)}
          </Text>
          <Text style={[styles.overviewMeta, { color: colors.textMuted }]}>
            {s.highPriMonth > 0
              ? `${formatPhp(s.highPriBillsTotal)} high-priority bills + ${formatPhp(s.loanPay)} loan repayments`
              : "No high-priority bills or loans on file this period"}
          </Text>
          {(s.highPriExpensesMonth > 0 || s.unpaidHighPriExpensesMonth > 0) && (
            <Text style={[styles.overviewDetail, { color: colors.textMuted }]}>
              {[
                s.highPriExpensesMonth > 0
                  ? `${formatPhp(s.highPriExpensesMonth)} paid`
                  : null,
                s.unpaidHighPriExpensesMonth > 0
                  ? `${formatPhp(s.unpaidHighPriExpensesMonth)} awaiting`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
        </View>

        <View
          style={[styles.overviewDivider, { backgroundColor: colors.border }]}
        />

        <View style={styles.overviewBlock}>
          <View style={styles.overviewBlockHead}>
            <FontAwesome
              name="leaf"
              size={16}
              color={colors.primary}
              style={styles.overviewBlockIcon}
            />
            <Text style={[styles.overviewBlockTitle, { color: colors.text }]}>
              Low Priority Expense
            </Text>
          </View>
          <Text style={[styles.overviewValue, { color: colors.text }]}>
            {formatPhp(s.lowPriMonth)}
          </Text>
          <Text style={[styles.overviewMeta, { color: colors.textMuted }]}>
            This budget period
          </Text>
        </View>
      </View>

      <SavingsProgress
        periodFrom={{
          periodRangeFormatted: s.periodRangeFormatted,
          periodEndFormatted: s.periodEndFormatted,
          periodRuleText: s.periodRuleText,
        }}
      />

      <ComputationInfoCollapsible metrics={s} />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Active loans
      </Text>
      {activeLoans.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          No active loans. Tap + and choose Loan to add one.
        </Text>
      ) : (
        activeLoans
          .slice(0, 4)
          .map((loan) => <LoanRow key={loan.id} loan={loan} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: 20 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  backLabel: { fontSize: 16, fontWeight: "700" },
  heading: { fontSize: 28, fontWeight: "800" },
  tagline: { fontSize: 15, marginBottom: 16, marginTop: 4, fontWeight: "500" },
  selectorLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selectorCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 12,
    gap: 10,
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectorIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectorIconBtnDisabled: { opacity: 0.45 },
  selectorMonth: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  yearRowLabel: { fontSize: 13, fontWeight: "700" },
  yearStepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  yearStepBtn: { minWidth: 44, minHeight: 40 },
  yearValue: {
    fontSize: 18,
    fontWeight: "800",
    minWidth: 52,
    textAlign: "center",
  },
  currentBadge: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
  },
  empty: { fontSize: 14, lineHeight: 20 },
  overviewCard: { borderRadius: 16, borderWidth: 1, paddingVertical: 4 },
  overviewBlock: { paddingHorizontal: 14, paddingVertical: 12 },
  overviewBlockHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  overviewBlockIcon: { marginRight: 8 },
  overviewBlockTitle: { fontSize: 15, fontWeight: "800" },
  overviewBody: { fontSize: 13, lineHeight: 19 },
  overviewValue: { fontSize: 22, fontWeight: "800" },
  overviewMeta: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
    fontWeight: "600",
  },
  overviewDetail: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
    fontWeight: "500",
  },
  overviewDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
});
