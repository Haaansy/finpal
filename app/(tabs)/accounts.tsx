import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronIcon } from '@/components/ChevronIcon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useBudget } from '@/context/BudgetContext';
import { useFinpalDialog } from '@/context/FinpalDialogContext';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import { formatPhp } from '@/utils/currency';
import { formatCurrencyAsTyped, parseCurrencyInput } from '@/utils/currencyInput';
import type { AccountRow, SavingsBubbleRow } from '@/db/types';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function accountLinkedBubble(account: AccountRow, bubbles: SavingsBubbleRow[]): SavingsBubbleRow | null {
  const id = account.linked_bubble_id;
  if (!id) return null;
  return bubbles.find((b) => b.id === id) ?? null;
}

function linkedBucketLabel(bucket: string | null | undefined): string | null {
  if (!bucket) return null;
  if (bucket === 'future') return 'Future';
  if (bucket === 'emergency') return 'Emergency';
  if (bucket === 'travel') return 'Travel';
  return bucket;
}

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useFinpalTheme();
  const dialog = useFinpalDialog();
  const { height } = useWindowDimensions();

  const {
    ready,
    accounts,
    bubbles,
    createAccount,
    updateAccountBalance,
    linkAccountToBubble,
    linkAccountToSystemBucket,
    unlinkAccount,
    transferBetweenAccountAndBubble,
  } = useBudget();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBal, setNewBal] = useState('');
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] = useState<AccountRow | null>(null);
  const [editBal, setEditBal] = useState('');

  const [linkPickOpen, setLinkPickOpen] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDir, setTransferDir] = useState<'toBubble' | 'fromBubble'>('toBubble');
  const [transferBubbleId, setTransferBubbleId] = useState<number | null>(null);
  const [transferAmt, setTransferAmt] = useState('');

  const selectedLinked = useMemo(() => {
    if (!selected) return null;
    return accountLinkedBubble(selected, bubbles);
  }, [selected, bubbles]);

  const selectedLinkedBucket = useMemo(() => {
    if (!selected) return null;
    return linkedBucketLabel(selected.linked_bucket);
  }, [selected]);

  if (!ready) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Accounts</Text>
        <Text style={{ color: colors.textMuted, paddingHorizontal: 20 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }}
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

      <Text style={[styles.heading, { color: colors.text }]}>Accounts</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Add your bank accounts and link them to a bubble. Linked accounts mirror bubble balance.
      </Text>

      <Pressable
        onPress={() => {
          setNewName('');
          setNewBal('');
          setCreateOpen(true);
        }}
        style={[styles.addCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel="Create account"
      >
        <View style={[styles.addIcon, { backgroundColor: colors.surfaceSecondary }]}>
          <FontAwesome name="plus" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.addText, { color: colors.text }]}>Create account</Text>
        <View style={{ flex: 1 }} />
        <ChevronIcon direction="right" size={16} color={colors.textMuted} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Your accounts</Text>
      {accounts.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>No accounts yet.</Text>
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {accounts.map((a) => {
            const linked = accountLinkedBubble(a, bubbles);
            const bucket = linkedBucketLabel(a.linked_bucket);
            return (
              <Pressable
                key={a.id}
                onPress={() => {
                  setSelected(a);
                  setEditBal(formatCurrencyAsTyped(String(a.balance)));
                }}
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${a.name}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
                    {linked ? `Linked to: ${linked.name}` : bucket ? `Linked to: ${bucket}` : 'Not linked'}
                  </Text>
                </View>
                <Text style={[styles.rowAmount, { color: colors.text }]}>{formatPhp(a.balance)}</Text>
                <ChevronIcon direction="right" size={16} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Create account modal */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={[styles.backdrop, { minHeight: height }]} onPress={() => setCreateOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Create account</Text>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Name</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. BPI Savings"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
              ]}
            />
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Starting balance (PHP)</Text>
            <TextInput
              value={newBal}
              onChangeText={(t) => setNewBal(formatCurrencyAsTyped(t))}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
              ]}
            />
            <PrimaryButton
              title="Create"
              loading={busy}
              onPress={async () => {
                const name = newName.trim();
                const bal = parseCurrencyInput(newBal);
                if (!name) {
                  await dialog.alert('Name required', 'Enter an account name.');
                  return;
                }
                if (!Number.isFinite(bal) || bal < 0) {
                  await dialog.alert('Balance', 'Enter a valid starting balance (0 or more).');
                  return;
                }
                setBusy(true);
                try {
                  await createAccount({ name, balance: bal });
                  setCreateOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
              style={{ marginTop: 12 }}
            />
            <PrimaryButton title="Cancel" variant="outline" onPress={() => setCreateOpen(false)} style={{ marginTop: 8 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Account detail modal */}
      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={[styles.backdrop, { minHeight: height }]} onPress={() => setSelected(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selected ? (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                    {selected.name}
                  </Text>
                  <Pressable onPress={() => setSelected(null)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                    <FontAwesome name="times" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>

                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Balance (PHP)</Text>
                <TextInput
                  value={editBal}
                  onChangeText={(t) => setEditBal(formatCurrencyAsTyped(t))}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  editable={!selectedLinkedBucket}
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
                    selectedLinkedBucket && { opacity: 0.6 },
                  ]}
                />
                <Text style={[styles.smallHint, { color: colors.textMuted }]}>
                  {selectedLinked
                    ? `Linked to ${selectedLinked.name} (mirrors bubble)`
                    : selectedLinkedBucket
                      ? `Linked to ${selectedLinkedBucket} (mirrors system savings)`
                      : 'Not linked'}
                </Text>

                <PrimaryButton
                  title="Save balance"
                  loading={busy}
                  onPress={async () => {
                    if (selectedLinkedBucket) {
                      await dialog.alert('Linked account', 'Unlink this account to edit its balance.');
                      return;
                    }
                    const n = parseCurrencyInput(editBal);
                    if (!Number.isFinite(n) || n < 0) {
                      await dialog.alert('Balance', 'Enter a valid balance (0 or more).');
                      return;
                    }
                    setBusy(true);
                    try {
                      await updateAccountBalance(selected.id, n);
                      setSelected(null);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  style={{ marginTop: 10 }}
                />

                <View style={{ height: 10 }} />

                <PrimaryButton
                  title={selectedLinked ? 'Change link' : 'Link to bubble'}
                  variant="outline"
                  onPress={() => setLinkPickOpen(true)}
                />
                {selectedLinked || selectedLinkedBucket ? (
                  <PrimaryButton
                    title="Unlink"
                    variant="outline"
                    onPress={async () => {
                      const ok = await dialog.confirm(
                        'Unlink account?',
                        'This account will no longer mirror the linked bucket/bubble.'
                      );
                      if (!ok) return;
                      setBusy(true);
                      try {
                        await unlinkAccount(selected.id);
                        setSelected(null);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    style={{ marginTop: 8 }}
                    textStyle={{ color: colors.danger }}
                  />
                ) : null}

                {!selectedLinked && !selectedLinkedBucket ? (
                  <>
                    <View style={{ height: 10 }} />
                    <PrimaryButton
                      title="Transfer (unlinked)"
                      variant="ghost"
                      onPress={() => {
                        setTransferDir('toBubble');
                        setTransferBubbleId(bubbles[0]?.id ?? null);
                        setTransferAmt('');
                        setTransferOpen(true);
                      }}
                    />
                    <Text style={[styles.smallHint, { color: colors.textMuted }]}>
                      Transfers are only available while the account is unlinked.
                    </Text>
                  </>
                ) : null}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Link picker modal */}
      <Modal visible={linkPickOpen} transparent animationType="fade" onRequestClose={() => setLinkPickOpen(false)}>
        <Pressable style={[styles.backdrop, { minHeight: height }]} onPress={() => setLinkPickOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Link to bubble</Text>
            <Text style={[styles.smallHint, { color: colors.textMuted, marginTop: 6 }]}>
              Link to a system savings bucket or one of your custom bubbles.
            </Text>

            <View style={{ marginTop: 10, gap: 8 }}>
              {([
                { key: 'future', label: 'Future (system)' },
                { key: 'emergency', label: 'Emergency (system)' },
                { key: 'travel', label: 'Travel (system)' },
              ] as const).map((b) => (
                <Pressable
                  key={b.key}
                  onPress={async () => {
                    if (!selected) return;
                    setBusy(true);
                    try {
                      await linkAccountToSystemBucket(selected.id, b.key);
                      setLinkPickOpen(false);
                      setSelected(null);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.pickRow,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceSecondary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Link to ${b.label}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickTitle, { color: colors.text }]} numberOfLines={1}>
                      {b.label}
                    </Text>
                    <Text style={[styles.pickSub, { color: colors.textMuted }]}>
                      Mirrors savings totals
                    </Text>
                  </View>
                  <ChevronIcon direction="right" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
            {bubbles.length === 0 ? (
              <Text style={[styles.smallHint, { color: colors.textMuted, marginTop: 10 }]}>
                Create a bubble first in Savings.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {bubbles.map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={async () => {
                      if (!selected) return;
                      setBusy(true);
                      try {
                        await linkAccountToBubble(selected.id, b.id);
                        setLinkPickOpen(false);
                        setSelected(null);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.pickRow,
                      { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, opacity: pressed ? 0.85 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Link to ${b.name}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickTitle, { color: colors.text }]} numberOfLines={1}>
                        {b.name}
                      </Text>
                      <Text style={[styles.pickSub, { color: colors.textMuted }]}>
                        {formatPhp(b.current_amount)} / {formatPhp(b.target_amount)}
                      </Text>
                    </View>
                    <ChevronIcon direction="right" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <PrimaryButton title="Cancel" variant="outline" onPress={() => setLinkPickOpen(false)} style={{ marginTop: 12 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Transfer modal (unlinked only) */}
      <Modal visible={transferOpen} transparent animationType="fade" onRequestClose={() => setTransferOpen(false)}>
        <Pressable style={[styles.backdrop, { minHeight: height }]} onPress={() => setTransferOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Transfer</Text>
            <View style={styles.transferTabs}>
              {(['toBubble', 'fromBubble'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setTransferDir(k)}
                  style={[
                    styles.transferTab,
                    { backgroundColor: transferDir === k ? colors.primary : colors.surfaceSecondary },
                  ]}
                >
                  <Text style={{ color: transferDir === k ? '#fff' : colors.text, fontWeight: '800' }}>
                    {k === 'toBubble' ? 'Account → Bubble' : 'Bubble → Account'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Bubble</Text>
            <View style={{ gap: 8 }}>
              {bubbles.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => setTransferBubbleId(b.id)}
                  style={[
                    styles.pickRow,
                    {
                      borderColor: transferBubbleId === b.id ? colors.primary : colors.border,
                      backgroundColor: colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Text style={[styles.pickTitle, { color: colors.text }]} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={[styles.pickSub, { color: colors.textMuted }]}>
                    {formatPhp(b.current_amount)} / {formatPhp(b.target_amount)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Amount (PHP)</Text>
            <TextInput
              value={transferAmt}
              onChangeText={(t) => setTransferAmt(formatCurrencyAsTyped(t))}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
              ]}
            />

            <PrimaryButton
              title="Transfer"
              loading={busy}
              onPress={async () => {
                if (!selected) return;
                if (!transferBubbleId) {
                  await dialog.alert('Bubble', 'Choose a bubble.');
                  return;
                }
                const amt = parseCurrencyInput(transferAmt);
                if (!Number.isFinite(amt) || amt <= 0) {
                  await dialog.alert('Amount', 'Enter a positive amount.');
                  return;
                }
                setBusy(true);
                try {
                  await transferBetweenAccountAndBubble({
                    accountId: selected.id,
                    bubbleId: transferBubbleId,
                    amount: transferDir === 'toBubble' ? amt : -amt,
                  });
                  setTransferOpen(false);
                  setSelected(null);
                } catch (e) {
                  await dialog.alert('Transfer failed', e instanceof Error ? e.message : 'Failed');
                } finally {
                  setBusy(false);
                }
              }}
              style={{ marginTop: 12 }}
            />
            <PrimaryButton title="Cancel" variant="outline" onPress={() => setTransferOpen(false)} style={{ marginTop: 8 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 16, fontWeight: '700' },
  heading: { fontSize: 28, fontWeight: '800', paddingHorizontal: 20 },
  sub: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, marginTop: 6, marginBottom: 14 },
  addCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 15, fontWeight: '800' },
  sectionTitle: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  empty: { paddingHorizontal: 20, fontSize: 14, lineHeight: 20, marginTop: 4 },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowTitle: { fontSize: 16, fontWeight: '800' },
  rowSub: { fontSize: 12, marginTop: 4 },
  rowAmount: { fontSize: 14, fontWeight: '800' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  sheet: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  fieldLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  smallHint: { fontSize: 12, marginTop: 6, lineHeight: 16 },
  pickRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  pickTitle: { fontSize: 15, fontWeight: '800' },
  pickSub: { fontSize: 12, marginTop: 4 },
  transferTabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  transferTab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});

