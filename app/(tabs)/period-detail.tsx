import { ChevronIcon } from "@/components/ChevronIcon";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBudget } from "@/context/BudgetContext";
import { useFinpalTheme } from "@/context/FinpalThemeContext";
import type { TransactionRow } from "@/db/types";
import {
  expensePeriodDate,
  getBudgetPeriodRange,
  isDateInRange,
  isExpenseSettled,
} from "@/utils/calculations";
import { formatPhpLedger } from "@/utils/currency";
import { formatIsoDateEnPh } from "@/utils/dates";

type Kind = "income" | "high" | "low";

function titleForKind(k: Kind): string {
  if (k === "income") return "Income";
  if (k === "high") return "High priority expense";
  return "Low priority expense";
}

function filterRows(rows: TransactionRow[], range: { start: string; end: string }, kind: Kind): TransactionRow[] {
  if (kind === "income") {
    return rows
      .filter((t) => t.type === "income" && isDateInRange(t.date.slice(0, 10), range))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }
  if (kind === "high") {
    return rows
      .filter(
        (t) =>
          t.type === "expense" &&
          t.priority === "high" &&
          isDateInRange(expensePeriodDate(t), range),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }
  return rows
    .filter(
      (t) =>
        t.type === "expense" &&
        t.priority === "low" &&
        isExpenseSettled(t) &&
        isDateInRange(expensePeriodDate(t), range),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export default function PeriodDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useFinpalTheme();
  const { transactions, settings, ready } = useBudget();
  const raw = useLocalSearchParams<{ kind?: string | string[] }>();
  const kindParam = Array.isArray(raw.kind) ? raw.kind[0] : raw.kind;
  const kind: Kind =
    kindParam === "income" || kindParam === "high" || kindParam === "low" ? kindParam : "income";

  const range = useMemo(
    () => getBudgetPeriodRange(settings.budgetPeriodEndDay, new Date()),
    [settings.budgetPeriodEndDay],
  );

  const rows = useMemo(
    () => filterRows(transactions, range, kind),
    [transactions, range, kind],
  );

  const periodHint = `${formatIsoDateEnPh(range.start)} – ${formatIsoDateEnPh(range.end)}`;

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: 28 },
      ]}
      keyboardShouldPersistTaps="handled"
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

      <Text style={[styles.heading, { color: colors.text }]}>{titleForKind(kind)}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Current budget period: {periodHint}. Tap a row to edit the entry.
      </Text>

      {rows.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          No {kind === "income" ? "income" : "expense"} rows in this period.
        </Text>
      ) : (
        rows.map((t) => (
          <Pressable
            key={t.id}
            onPress={() =>
              router.push({
                pathname: "/entry",
                params: { editId: String(t.id), mode: t.type },
              })
            }
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${t.description ?? t.category ?? "entry"}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.amount, { color: colors.text }]}>
                {formatPhpLedger(t.amount, t.type)}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={2}>
                {t.description || t.category || (t.type === "income" ? "Income" : "Expense")}
              </Text>
              <Text style={[styles.dateLine, { color: colors.textMuted }]}>
                {formatIsoDateEnPh(t.date)}
                {kind !== "income" && t.due_date ? ` · Due ${formatIsoDateEnPh(t.due_date)}` : ""}
              </Text>
            </View>
            <ChevronIcon direction="right" size={16} color={colors.textMuted} />
          </Pressable>
        ))
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
  heading: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  sub: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  empty: { fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  amount: { fontSize: 17, fontWeight: "800" },
  meta: { fontSize: 13, marginTop: 4 },
  dateLine: { fontSize: 12, marginTop: 4, fontWeight: "600" },
});
