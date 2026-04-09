import { ChevronIcon } from "@/components/ChevronIcon";
import { Link, router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PriorityBadge } from "@/components/PriorityBadge";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { useBudget } from "@/context/BudgetContext";
import { useFinpalTheme } from "@/context/FinpalThemeContext";
import type { ExpensePriority, TransactionRow } from "@/db/types";
import type { FinpalColors } from "@/theme/colors";
import {
  isExpenseSettled,
  isLoanRepaymentChecklistPending,
} from "@/utils/calculations";
import { formatPhpLedger } from "@/utils/currency";
import {
  calendarMonthKey,
  formatIsoDateEnPh,
  formatYearMonthHeading,
  yearMonthFromIsoDate,
} from "@/utils/dates";

type Filter = "all" | ExpensePriority;

type TxSection = { title: string; data: TransactionRow[] };

function uniqueSortedYearMonthsFromRows(rows: TransactionRow[]): string[] {
  const set = new Set<string>();
  for (const t of rows) {
    const ym = yearMonthFromIsoDate(t.date);
    if (ym) set.add(ym);
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

function groupTransactionsByDate(rows: TransactionRow[]): TxSection[] {
  const map = new Map<string, TransactionRow[]>();
  for (const t of rows) {
    const key = t.date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((dateKey) => ({
    title: formatIsoDateEnPh(dateKey),
    data: map.get(dateKey)!,
  }));
}

function buildTransactionSections(rows: TransactionRow[]): {
  sections: TxSection[];
  monthGrouped: boolean;
} {
  const months = uniqueSortedYearMonthsFromRows(rows);
  if (months.length <= 1) {
    return { sections: groupTransactionsByDate(rows), monthGrouped: false };
  }
  const sections: TxSection[] = [];
  for (const ym of months) {
    const inMonth = rows.filter((t) => yearMonthFromIsoDate(t.date) === ym);
    inMonth.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    sections.push({ title: formatYearMonthHeading(ym), data: inMonth });
  }
  return { sections, monthGrouped: true };
}

function TypeBadge({
  type,
  colors,
}: {
  type: "income" | "expense";
  colors: FinpalColors;
}) {
  const isIncome = type === "income";
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isIncome
            ? `${colors.success}22`
            : colors.surfaceSecondary,
          borderColor: isIncome ? colors.success : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: isIncome ? colors.success : colors.text },
        ]}
      >
        {isIncome ? "Income" : "Expense"}
      </Text>
    </View>
  );
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useFinpalTheme();
  const { transactions, loans, removeTransaction, ready } = useBudget();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<TransactionRow | null>(null);
  const [allMonths, setAllMonths] = useState(true);
  const [pickedMonthAnchor, setPickedMonthAnchor] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 15),
  );
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const pendingCount = useMemo(() => {
    const ym = calendarMonthKey();
    const bills = transactions.filter(
      (t) => t.type === "expense" && !isExpenseSettled(t),
    ).length;
    const loanN = loans.filter((l) =>
      isLoanRepaymentChecklistPending(l, ym),
    ).length;
    return bills + loanN;
  }, [transactions, loans]);

  const settledTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.type === "income" || isExpenseSettled(t),
    );
  }, [transactions]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return settledTransactions;
    return settledTransactions.filter(
      (t) => t.type === "expense" && t.priority === filter,
    );
  }, [settledTransactions, filter]);

  const visibleRows = useMemo(() => {
    let rows = filteredRows;
    if (!allMonths) {
      const ym = `${pickedMonthAnchor.getFullYear()}-${String(pickedMonthAnchor.getMonth() + 1).padStart(2, "0")}`;
      rows = rows.filter((t) => yearMonthFromIsoDate(t.date) === ym);
    }
    return rows;
  }, [filteredRows, allMonths, pickedMonthAnchor]);

  const { sections: rawSections, monthGrouped } = useMemo(
    () => buildTransactionSections(visibleRows),
    [visibleRows],
  );

  const sections = useMemo(() => {
    if (!monthGrouped) return rawSections;
    return rawSections.map((s) => {
      const key = s.title;
      const open = openMonths[key] ?? true;
      return open ? s : { ...s, data: [] };
    });
  }, [rawSections, monthGrouped, openMonths]);

  const renderItem = ({
    item,
    index,
    section,
  }: {
    item: TransactionRow;
    index: number;
    section: TxSection;
  }) => {
    const prev = index > 0 ? section.data[index - 1] : null;
    const showDayHeader = monthGrouped && (!prev || prev.date !== item.date);
    const dayKey = `${section.title}|${item.date}`;
    const dayOpen = openDays[dayKey] ?? true;
    if (monthGrouped && !dayOpen) {
      // Still render the day header as a collapsible control.
      if (!showDayHeader) return null;
      return (
        <Pressable
          onPress={() => setOpenDays((m) => ({ ...m, [dayKey]: true }))}
          style={({ pressed }) => [
            styles.dayHeaderRow,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.dayHeader, { color: colors.textMuted }]}>
            {formatIsoDateEnPh(item.date)}
          </Text>
          <ChevronIcon direction="down" size={16} color={colors.textMuted} />
        </Pressable>
      );
    }
    return (
      <View>
        {showDayHeader ? (
          <Pressable
            onPress={() =>
              setOpenDays((m) => ({ ...m, [dayKey]: !(m[dayKey] ?? true) }))
            }
            style={({ pressed }) => [
              styles.dayHeaderRow,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Toggle ${formatIsoDateEnPh(item.date)}`}
          >
            <Text style={[styles.dayHeader, { color: colors.textMuted }]}>
              {formatIsoDateEnPh(item.date)}
            </Text>
            <ChevronIcon
              direction={dayOpen ? "up" : "down"}
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setSelected(item)}
          style={[
            styles.row,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.rowMain}>
            <View style={styles.badgeRow}>
              <TypeBadge type={item.type} colors={colors} />
              {item.type === "expense" && item.priority && (
                <PriorityBadge priority={item.priority} colors={colors} />
              )}
            </View>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {formatPhpLedger(item.amount, item.type)}
            </Text>
            <Text
              style={[styles.rowSub, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {item.description ||
                item.category ||
                (item.type === "income" ? "Income" : "Expense")}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: TxSection }) =>
    monthGrouped ? (
      <Pressable
        onPress={() =>
          setOpenMonths((m) => ({
            ...m,
            [section.title]: !(m[section.title] ?? true),
          }))
        }
        style={({ pressed }) => [
          styles.monthHeaderRow,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${section.title}`}
      >
        <Text
          style={[
            styles.sectionHeader,
            styles.sectionHeaderMonth,
            { color: colors.textMuted },
          ]}
        >
          {section.title}
        </Text>
        <ChevronIcon
          direction={(openMonths[section.title] ?? true) ? "up" : "down"}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>
    ) : (
      <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
        {section.title}
      </Text>
    );

  const listHeader = (
    <View>
      <Text style={[styles.heading, { color: colors.text }]}>Transactions</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Tap a row for details, edit, or delete
      </Text>

      {pendingCount > 0 ? (
        <Link href="/due-checklist" asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.checklistBanner,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.primary,
              },
            ])}
            accessibilityRole="button"
            accessibilityLabel={`Open due checklist, ${pendingCount} items pending`}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.checklistBannerTitle, { color: colors.text }]}
              >
                {pendingCount} item{pendingCount !== 1 ? "s" : ""} on checklist
              </Text>
              <Text
                style={[styles.checklistBannerSub, { color: colors.textMuted }]}
              >
                Bills and loans — open to mark paid
              </Text>
            </View>
            <ChevronIcon direction="right" size={16} color={colors.primary} />
          </Pressable>
        </Link>
      ) : null}

      <View style={styles.filters}>
        {(["all", "high", "low"] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.chip,
              { borderColor: colors.border },
              filter === f && {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.text },
                filter === f && { color: "#fff", fontWeight: "700" },
              ]}
            >
              {f === "all"
                ? "All"
                : f === "high"
                  ? "High Priority Expense"
                  : "Low Priority Expense"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.filters}>
        <Pressable
          onPress={() => setAllMonths(true)}
          style={[
            styles.chip,
            { borderColor: colors.border },
            allMonths && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: colors.text },
              allMonths && { color: "#fff", fontWeight: "700" },
            ]}
          >
            All months
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setAllMonths(false)}
          style={[
            styles.chip,
            { borderColor: colors.border },
            !allMonths && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: colors.text },
              !allMonths && { color: "#fff", fontWeight: "700" },
            ]}
          >
            Pick month
          </Text>
        </Pressable>
      </View>

      {!allMonths ? (
        <View
          style={[
            styles.monthPickRow,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Pressable
            onPress={() =>
              setPickedMonthAnchor(
                (d) => new Date(d.getFullYear(), d.getMonth() - 1, 15),
              )
            }
            hitSlop={10}
          >
            <ChevronIcon direction="left" size={18} color={colors.primary} />
          </Pressable>
          <Text style={[styles.monthPickLabel, { color: colors.text }]}>
            {formatYearMonthHeading(
              `${pickedMonthAnchor.getFullYear()}-${String(pickedMonthAnchor.getMonth() + 1).padStart(2, "0")}`,
            )}
          </Text>
          <Pressable
            onPress={() =>
              setPickedMonthAnchor(
                (d) => new Date(d.getFullYear(), d.getMonth() + 1, 15),
              )
            }
            hitSlop={10}
          >
            <ChevronIcon direction="right" size={18} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}

      <Text style={[styles.listSectionLabel, { color: colors.textMuted }]}>
        {monthGrouped ? "Collapsible by month and day" : "By date"}
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 8 },
      ]}
    >
      {!ready ? (
        <>
          <Text style={[styles.heading, { color: colors.text }]}>
            Transactions
          </Text>
          <Text style={{ color: colors.textMuted }}>Loading…</Text>
        </>
      ) : (
        <>
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListHeaderComponent={listHeader}
            stickySectionHeadersEnabled={monthGrouped}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              filteredRows.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textMuted }]}>
                  {pendingCount > 0
                    ? "No settled transactions in this view. Mark bills paid from the checklist to see them here."
                    : filter === "all"
                      ? "No transactions yet."
                      : "No transactions in this view."}
                </Text>
              ) : null
            }
          />
          <TransactionDetailModal
            visible={selected !== null}
            transaction={selected}
            onClose={() => setSelected(null)}
            onEdit={(t) => {
              setSelected(null);
              router.push({
                pathname: "/entry",
                params: { editId: String(t.id), mode: t.type },
              });
            }}
            onDelete={async (t) => {
              await removeTransaction(t.id);
              setSelected(null);
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  heading: { fontSize: 22, fontWeight: "800" },
  hint: { fontSize: 12, marginBottom: 12 },
  checklistBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  checklistBannerTitle: { fontSize: 15, fontWeight: "800" },
  checklistBannerSub: { fontSize: 12, marginTop: 4 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13 },
  listSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHeaderMonth: {
    fontSize: 15,
    marginTop: 16,
    textTransform: "none",
    letterSpacing: 0.2,
  },
  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 6,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 6,
  },
  monthPickRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  monthPickLabel: { fontSize: 15, fontWeight: "800" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowMain: { flex: 1, marginRight: 8 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  rowTitle: { fontSize: 17, fontWeight: "700" },
  rowSub: { fontSize: 13, marginTop: 4 },
  empty: { textAlign: "center", marginTop: 24, fontSize: 15 },
});
