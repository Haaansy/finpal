import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChevronIcon } from "@/components/ChevronIcon";
import { DatePickerField } from "@/components/DatePickerField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useBudget } from "@/context/BudgetContext";
import { useFinpalDialog } from "@/context/FinpalDialogContext";
import { useFinpalTheme } from "@/context/FinpalThemeContext";
import type { SavingsBubbleRow } from "@/db/types";
import { useCalculations } from "@/hooks/useCalculations";
import { formatPhp } from "@/utils/currency";
import {
  formatCurrencyAsTyped,
  parseCurrencyInput,
} from "@/utils/currencyInput";
import { parseIsoToDate } from "@/utils/dates";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function BubbleCard({
  title,
  subtitle,
  amount,
  target,
  accent,
  onPress,
}: {
  title: string;
  subtitle: string;
  amount: number;
  target?: number;
  accent: string;
  onPress?: () => void;
}) {
  const { colors } = useFinpalTheme();
  const ratio = target && target > 0 ? clamp01(amount / target) : 0;
  const fillPct = Math.round(ratio * 100);

  const Body = (
    <View
      style={[
        styles.bubbleCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            borderColor: colors.border,
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <View
          style={[
            styles.bubbleFill,
            {
              backgroundColor: `${accent}44`,
              height: `${fillPct}%` as `${number}%`,
            },
          ]}
        />
        <View style={[styles.bubbleRing, { borderColor: accent }]} />
        <Text
          style={[styles.bubbleText, { color: colors.text }]}
          numberOfLines={2}
        >
          {formatPhp(amount)}
        </Text>
      </View>
      <Text
        style={[styles.bubbleTitle, { color: colors.text }]}
        numberOfLines={2}
      >
        {title}
      </Text>
      <Text
        style={[styles.bubbleSub, { color: colors.textMuted }]}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
    </View>
  );

  if (!onPress) return Body;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.9 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
    >
      {Body}
    </Pressable>
  );
}

export default function SavingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useFinpalTheme();
  const dialog = useFinpalDialog();
  const {
    ready,
    savings,
    bubbles,
    createBubble,
    depositToBubbleFromSafeToSpend,
    withdrawFromBubbleToSafeToSpend,
    transferBetweenBubbles,
  } = useBudget();
  const calc = useCalculations();
  const { height } = useWindowDimensions();

  const safeToSpend = Math.max(0, calc.safeToSpend ?? 0);

  const systemBubbles = useMemo(
    () => [
      {
        key: "future",
        title: "Future",
        amount: savings.standard,
        accent: "#9C27B0",
      },
      {
        key: "emergency",
        title: "Emergency",
        amount: savings.emergency,
        accent: "#E91E63",
      },
      {
        key: "travel",
        title: "Travel",
        amount: savings.travel,
        accent: "#AB47BC",
      },
    ],
    [savings.standard, savings.emergency, savings.travel],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [newRemindTime, setNewRemindTime] = useState("09:00");
  const [busy, setBusy] = useState(false);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionBubble, setActionBubble] = useState<SavingsBubbleRow | null>(
    null,
  );
  const [mode, setMode] = useState<"deposit" | "withdraw" | "transfer">(
    "deposit",
  );
  const [amtText, setAmtText] = useState("");
  const [toBubbleId, setToBubbleId] = useState<number | null>(null);

  const openActions = (b: SavingsBubbleRow) => {
    setActionBubble(b);
    setMode("deposit");
    setAmtText("");
    const firstOther = bubbles.find((x) => x.id !== b.id)?.id ?? null;
    setToBubbleId(firstOther);
    setActionOpen(true);
  };

  if (!ready) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: colors.background, paddingTop: insets.top + 12 },
        ]}
      >
        <Text style={[styles.heading, { color: colors.text }]}>Savings</Text>
        <Text style={{ color: colors.textMuted, paddingHorizontal: 20 }}>
          Loading…
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 28,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronIcon direction="left" size={18} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
      </Pressable>

      <Text style={[styles.heading, { color: colors.text }]}>Savings</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Deposit from Safe-to-spend into your savings bubbles.
      </Text>

      <View
        style={[
          styles.banner,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.bannerIcon}>
          <FontAwesome name="shield" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: colors.text }]}>
            Safe-to-spend
          </Text>
          <Text style={[styles.bannerValue, { color: colors.text }]}>
            {formatPhp(safeToSpend)}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        System bubbles
      </Text>
      <View style={styles.grid}>
        {systemBubbles.map((b) => (
          <BubbleCard
            key={b.key}
            title={b.title}
            subtitle="Running balance"
            amount={b.amount}
            accent={b.accent}
          />
        ))}
      </View>

      <View
        style={[
          styles.comingSoonCard,
          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.comingSoonTitle, { color: colors.text }]}>Your bubbles</Text>
        <Text style={[styles.comingSoonBadge, { color: colors.textMuted, borderColor: colors.border }]}>
          Coming soon
        </Text>
        <Text style={[styles.comingSoonBody, { color: colors.textMuted }]}>
          Custom savings bubbles are temporarily disabled while we polish this feature. System bubbles above still
          reflect Future, Emergency, and Travel from your budget.
        </Text>
      </View>

      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { minHeight: height }]}
          onPress={() => setCreateOpen(false)}
        >
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Create bubble
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              Name
            </Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. New phone"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              Target (PHP)
            </Text>
            <TextInput
              value={newTarget}
              onChangeText={(t) => setNewTarget(formatCurrencyAsTyped(t))}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            />

            <DatePickerField
              label="Target date (optional)"
              value={newTargetDate}
              onChange={setNewTargetDate}
              colors={colors}
              optional
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              Reminder time (HH:MM)
            </Text>
            <TextInput
              value={newRemindTime}
              onChangeText={setNewRemindTime}
              placeholder="09:00"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            />

            <PrimaryButton
              title="Create"
              loading={busy}
              onPress={async () => {
                const name = newName.trim();
                const target = parseCurrencyInput(newTarget);
                const td = newTargetDate.trim();
                const time = newRemindTime.trim();
                if (td && !parseIsoToDate(td)) {
                  await dialog.alert(
                    "Target date",
                    "Choose a valid target date or clear the field.",
                  );
                  return;
                }
                if (td && !/^\d{1,2}:\d{2}$/.test(time)) {
                  await dialog.alert(
                    "Reminder time",
                    "Use 24-hour time like 09:00 or 18:30.",
                  );
                  return;
                }
                if (!name) {
                  await dialog.alert("Name required", "Enter a bubble name.");
                  return;
                }
                if (!Number.isFinite(target) || target < 0) {
                  await dialog.alert(
                    "Target",
                    "Enter a valid target amount (0 or more).",
                  );
                  return;
                }
                setBusy(true);
                try {
                  await createBubble({
                    name,
                    target_amount: target,
                    target_date: td || null,
                    remind_enabled: td ? 1 : 0,
                    remind_time: td ? time : null,
                  } as any);
                  setCreateOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
              style={{ marginTop: 12 }}
            />
            <PrimaryButton
              title="Cancel"
              variant="outline"
              onPress={() => setCreateOpen(false)}
              style={{ marginTop: 8 }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={actionOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setActionOpen(false)}
      >
        <Pressable
          style={[styles.backdrop, { minHeight: height }]}
          onPress={() => setActionOpen(false)}
        >
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Bubble
            </Text>
            <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
              {actionBubble ? actionBubble.name : ""}
            </Text>
            {actionBubble?.target_date ? (
              <Text
                style={[
                  styles.sheetSub,
                  { color: colors.textMuted, marginTop: 4 },
                ]}
              >
                Target date: {actionBubble.target_date}
              </Text>
            ) : null}

            <View
              style={[
                styles.modeTabs,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              {(["deposit", "withdraw", "transfer"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={[
                    styles.modeTab,
                    mode === m && { backgroundColor: colors.primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${m}`}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      { color: mode === m ? "#fff" : colors.text },
                    ]}
                  >
                    {m === "deposit"
                      ? "Deposit"
                      : m === "withdraw"
                        ? "Withdraw"
                        : "Transfer"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === "transfer" ? (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  To bubble
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {bubbles
                    .filter((b) =>
                      actionBubble ? b.id !== actionBubble.id : true,
                    )
                    .map((b) => {
                      const sel = toBubbleId === b.id;
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => setToBubbleId(b.id)}
                          style={[
                            styles.pill,
                            {
                              borderColor: sel ? colors.primary : colors.border,
                              backgroundColor: colors.surfaceSecondary,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: sel ? "800" : "700",
                            }}
                          >
                            {b.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                </ScrollView>
              </>
            ) : null}

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              Amount (PHP)
            </Text>
            <TextInput
              value={amtText}
              onChangeText={(t) => setAmtText(formatCurrencyAsTyped(t))}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
            />
            {mode === "deposit" ? (
              <Text style={[styles.smallHint, { color: colors.textMuted }]}>
                Available safe-to-spend: {formatPhp(safeToSpend)}
              </Text>
            ) : mode === "withdraw" ? (
              <Text style={[styles.smallHint, { color: colors.textMuted }]}>
                Available in bubble:{" "}
                {formatPhp(actionBubble?.current_amount ?? 0)}
              </Text>
            ) : (
              <Text style={[styles.smallHint, { color: colors.textMuted }]}>
                From bubble: {formatPhp(actionBubble?.current_amount ?? 0)}
              </Text>
            )}

            <PrimaryButton
              title={
                mode === "deposit"
                  ? "Deposit"
                  : mode === "withdraw"
                    ? "Withdraw"
                    : "Transfer"
              }
              loading={busy}
              onPress={async () => {
                if (!actionBubble) return;
                const n = parseCurrencyInput(amtText);
                if (!Number.isFinite(n) || n <= 0) {
                  await dialog.alert("Amount", "Enter a positive amount.");
                  return;
                }
                setBusy(true);
                try {
                  if (mode === "deposit") {
                    if (n > safeToSpend) {
                      await dialog.alert(
                        "Not enough safe-to-spend",
                        "Reduce the amount or add more income.",
                      );
                      return;
                    }
                    await depositToBubbleFromSafeToSpend({
                      bubbleId: actionBubble.id,
                      amount: n,
                      date: todayIso(),
                    });
                    setActionOpen(false);
                    return;
                  }
                  if (mode === "withdraw") {
                    if (n > (actionBubble.current_amount ?? 0)) {
                      await dialog.alert(
                        "Not enough in bubble",
                        "Reduce the amount.",
                      );
                      return;
                    }
                    await withdrawFromBubbleToSafeToSpend({
                      bubbleId: actionBubble.id,
                      amount: n,
                      date: todayIso(),
                    });
                    setActionOpen(false);
                    return;
                  }
                  // transfer
                  if (!toBubbleId) {
                    await dialog.alert(
                      "To bubble",
                      "Choose a destination bubble.",
                    );
                    return;
                  }
                  if (n > (actionBubble.current_amount ?? 0)) {
                    await dialog.alert(
                      "Not enough in bubble",
                      "Reduce the amount.",
                    );
                    return;
                  }
                  await transferBetweenBubbles({
                    fromBubbleId: actionBubble.id,
                    toBubbleId,
                    amount: n,
                  });
                  setActionOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
              style={{ marginTop: 12 }}
            />
            <PrimaryButton
              title="Cancel"
              variant="outline"
              onPress={() => setActionOpen(false)}
              style={{ marginTop: 8 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  backText: { fontSize: 16, fontWeight: "700" },
  heading: { fontSize: 28, fontWeight: "800", paddingHorizontal: 20 },
  sub: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 14,
  },
  banner: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bannerValue: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  sectionHead: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  linkBtn: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  linkBtnText: { fontSize: 14, fontWeight: "800" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  empty: { paddingHorizontal: 20, fontSize: 14, lineHeight: 20, marginTop: 4 },
  comingSoonCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  comingSoonTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  comingSoonBadge: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  comingSoonBody: { fontSize: 13, lineHeight: 19 },
  bubbleCard: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  modeTabs: {
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modeTabText: { fontSize: 13, fontWeight: "800" },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  bubble: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  bubbleRing: {
    position: "absolute",
    inset: 6,
    borderRadius: 52,
    borderWidth: 2,
  },
  bubbleFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 10,
  },
  bubbleTitle: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  bubbleSub: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  sheet: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800" },
  sheetSub: { fontSize: 13, marginTop: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  smallHint: { fontSize: 12, marginTop: 6, lineHeight: 16 },
});
