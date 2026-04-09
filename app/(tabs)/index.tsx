import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ComputationInfoCollapsible } from "@/components/ComputationInfoCollapsible";
import { LoanRow } from "@/components/LoanRow";
import { SafeToSpendCard } from "@/components/SafeToSpendCard";
import { SavingsProgress } from "@/components/SavingsProgress";
import { useBudget } from "@/context/BudgetContext";
import { useFinpalTheme } from "@/context/FinpalThemeContext";
import { useCalculations } from "@/hooks/useCalculations";
import { useDueDatesOverview } from "@/hooks/useDueDatesOverview";
import { getBudgetPeriodRange, isDateInRange } from "@/utils/calculations";
import { formatPhp } from "@/utils/currency";
import { projectedLoanRepaymentIsos } from "@/utils/loanSchedule";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useFinpalTheme();
  const { ready, loans, settings } = useBudget();
  const dueDatesOverview = useDueDatesOverview();
  const {
    safeToSpend,
    periodEndFormatted,
    periodRangeFormatted,
    incomeMonth,
    highPriBillsTotal,
    highPriExpensesMonth,
    unpaidHighPriExpensesMonth,
    loanPay,
    highPriMonth,
    lowPriMonth,
  } = useCalculations();

  const currentRange = getBudgetPeriodRange(settings.budgetPeriodEndDay, new Date());
  const activeLoans = loans.filter((l) => {
    if (l.months_left <= 0) return false;
    const dueIsos = projectedLoanRepaymentIsos(l);
    return dueIsos.some((iso) => isDateInRange(iso, currentRange));
  });

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: 24 },
      ]}
    >
      <Text style={[styles.heading, { color: colors.text }]}>Finpal</Text>
      <Text style={[styles.tagline, { color: colors.textMuted }]}>
        — Your Financial Companion
      </Text>

      <SafeToSpendCard
        amount={safeToSpend}
        periodHint={`Ends ${periodEndFormatted} · ${periodRangeFormatted}`}
      />

      <Text style={[styles.quickAccessLabel, { color: colors.textMuted }]}>
        Quick access
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickAccessScroll}
        style={styles.quickAccessRow}
      >
        <Link href="/due-checklist" asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.quickChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ])}
            accessibilityRole="button"
            accessibilityLabel="Open due dates checklist"
          >
            <View
              style={[
                styles.quickChipIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <FontAwesome name="list-alt" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.quickChipText, { color: colors.text }]}>
              Due dates
            </Text>
          </Pressable>
        </Link>
        <Link href="/loans" asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.quickChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ])}
            accessibilityRole="button"
            accessibilityLabel="Open loans"
          >
            <View
              style={[
                styles.quickChipIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <FontAwesome name="money" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.quickChipText, { color: colors.text }]}>
              Loans
            </Text>
          </Pressable>
        </Link>
        <Link href="/past-overview" asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.quickChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ])}
            accessibilityRole="button"
            accessibilityLabel="Open period overview"
          >
            <View
              style={[
                styles.quickChipIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <FontAwesome name="history" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.quickChipText, { color: colors.text }]}>
              Period overview
            </Text>
          </Pressable>
        </Link>
        <Link href="/savings" asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.quickChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ])}
            accessibilityRole="button"
            accessibilityLabel="Open savings"
          >
            <View
              style={[
                styles.quickChipIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <FontAwesome name="pie-chart" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.quickChipText, { color: colors.text }]}>
              Savings
            </Text>
          </Pressable>
        </Link>
        <Link href="/accounts" asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.quickChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ])}
            accessibilityRole="button"
            accessibilityLabel="Open accounts"
          >
            <View
              style={[
                styles.quickChipIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <FontAwesome name="bank" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.quickChipText, { color: colors.text }]}>
              Accounts
            </Text>
          </Pressable>
        </Link>
      </ScrollView>

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
            {formatPhp(incomeMonth)}
          </Text>
          <Text style={[styles.overviewMeta, { color: colors.textMuted }]}>
            Settled income this budget period
          </Text>
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
            {formatPhp(highPriMonth)}
          </Text>
          <Text style={[styles.overviewMeta, { color: colors.textMuted }]}>
            {highPriMonth > 0
              ? `${formatPhp(highPriBillsTotal)} high-priority bills + ${formatPhp(loanPay)} loan repayments`
              : "No high-priority bills or loans on file this period"}
          </Text>
          {(highPriExpensesMonth > 0 || unpaidHighPriExpensesMonth > 0) && (
            <Text style={[styles.overviewDetail, { color: colors.textMuted }]}>
              {[
                highPriExpensesMonth > 0
                  ? `${formatPhp(highPriExpensesMonth)} paid`
                  : null,
                unpaidHighPriExpensesMonth > 0
                  ? `${formatPhp(unpaidHighPriExpensesMonth)} awaiting`
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
            {formatPhp(lowPriMonth)}
          </Text>
          <Text style={[styles.overviewMeta, { color: colors.textMuted }]}>
            This budget period
          </Text>
        </View>
      </View>

      <SavingsProgress />

      <ComputationInfoCollapsible />

      <View style={styles.sectionHead}>
        <Text
          style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}
        >
          Active loans
        </Text>
        <Link
          href="/loans"
          style={{ color: colors.primary, fontWeight: "600" }}
        >
          Manage
        </Link>
      </View>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
  },
  tagline: {
    fontSize: 15,
    marginBottom: 16,
    marginTop: 4,
    fontWeight: "500",
  },
  quickAccessLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  quickAccessRow: { marginBottom: 6, marginHorizontal: -4 },
  quickAccessScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  quickChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickChipText: { fontSize: 15, fontWeight: "700" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
  },
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 4,
  },
  overviewBlock: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  overviewBlockHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  overviewBlockIcon: { marginRight: 8 },
  overviewBlockTitle: { fontSize: 15, fontWeight: "800" },
  overviewBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: "800",
  },
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
  overviewDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
});
