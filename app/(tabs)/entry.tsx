import { ChevronIcon } from '@/components/ChevronIcon';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyTextInput } from '@/components/CurrencyTextInput';
import { CategoryPickerModal } from '@/components/CategoryPickerModal';
import { DatePickerField } from '@/components/DatePickerField';
import { PostSaveModal } from '@/components/PostSaveModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useBudget } from '@/context/BudgetContext';
import { useFinpalDialog } from '@/context/FinpalDialogContext';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/categories';
import { formatCurrencyAsTyped, parseCurrencyInput } from '@/utils/currencyInput';
import { incomeAllocationFromAmount } from '@/utils/calculations';
import { formatPhp } from '@/utils/currency';
import { savingsOfFundsRate } from '@/utils/budgetRates';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function EntryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useFinpalTheme();
  const { addIncome, addExpense, updateTransactionRow, transactions, settings, ready } = useBudget();
  const dialog = useFinpalDialog();
  const params = useLocalSearchParams<{ mode?: string | string[]; editId?: string | string[] }>();

  const editIdRaw = params.editId;
  const editIdStr = Array.isArray(editIdRaw) ? editIdRaw[0] : editIdRaw;
  const editingId = editIdStr ? Number(editIdStr) : NaN;
  const isEditing = Number.isFinite(editingId) && editingId > 0;

  const [mode, setMode] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    if (isEditing) return;
    const raw = params.mode;
    const m = Array.isArray(raw) ? raw[0] : raw;
    if (m === 'income' || m === 'expense') {
      setMode(m);
    }
  }, [params.mode, isEditing]);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayIso());
  const [priority, setPriority] = useState<'high' | 'low'>('low');
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [postSave, setPostSave] = useState<{ title: string; message: string } | null>(null);
  const [pickCategoryOpen, setPickCategoryOpen] = useState(false);
  const hydratedRef = useRef<number | null>(null);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('');
    setDate(todayIso());
    setPriority('low');
    setAwaitingPayment(false);
  };

  useEffect(() => {
    if (!ready) return;
    if (!isEditing) {
      hydratedRef.current = null;
      return;
    }
    const tx = transactions.find((t) => t.id === editingId);
    if (!tx) {
      void (async () => {
        await dialog.alert('Not found', 'This transaction is no longer available.');
        router.back();
      })();
      return;
    }
    if (hydratedRef.current === editingId) return;
    hydratedRef.current = editingId;
    setMode(tx.type);
    setAmount(formatCurrencyAsTyped(String(tx.amount)));
    setDescription(tx.description ?? '');
    setCategory(tx.category ?? '');
    setDate(tx.date);
    if (tx.type === 'expense') {
      setPriority(tx.priority === 'high' ? 'high' : 'low');
      const due = Boolean(tx.due_date?.trim());
      setAwaitingPayment(due && (tx.is_paid ?? 1) === 0);
    } else {
      setPriority('low');
      setAwaitingPayment(false);
    }
  }, [ready, isEditing, editingId, transactions, dialog]);

  const submit = async () => {
    const n = parseCurrencyInput(amount);
    if (!Number.isFinite(n) || n <= 0) {
      await dialog.alert('Invalid amount', 'Enter a positive number.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await updateTransactionRow(editingId, {
          amount: n,
          description: description.trim() || null,
          category: category.trim() || null,
          date,
          type: mode,
          priority: mode === 'income' ? null : priority,
          due_date: mode === 'expense' && awaitingPayment ? date : null,
          is_paid: mode === 'expense' && awaitingPayment ? 0 : 1,
        });
        router.back();
        return;
      }

      if (mode === 'income') {
        await addIncome({
          amount: n,
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          date,
        });
        const br = settings.budgetRates;
        const savPct = savingsOfFundsRate(br);
        const a = incomeAllocationFromAmount(n, br);
        const incomeMsg = `${(br.disposableOfFunds * 100).toFixed(0)}% disposable ${formatPhp(a.disposable)}; ${(savPct * 100).toFixed(0)}% savings (${formatPhp(n * savPct)}) → future ${formatPhp(a.future)}, emergency ${formatPhp(a.emergency)}, travel ${formatPhp(a.travel)}.`;
        resetForm();
        setPostSave({
          title: 'Income saved',
          message: `${incomeMsg}\n\nAdd another entry or finish?`,
        });
      } else {
        await addExpense({
          amount: n,
          description: description.trim() || undefined,
          category: category.trim() || undefined,
          priority,
          date,
          awaitingPayment,
        });
        resetForm();
        setPostSave({
          title: 'Expense saved',
          message: 'Add another entry or go back when you are finished.',
        });
      }
    } catch (e) {
      await dialog.alert('Error', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setLoading(false);
    }
  };

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
      <Text style={[styles.title, { color: colors.text }]}>
        {isEditing ? 'Edit transaction' : 'Log transaction'}
      </Text>

      <View
        style={[
          styles.toggle,
          { backgroundColor: colors.surfaceSecondary },
          isEditing && { opacity: 0.55 },
        ]}
        pointerEvents={isEditing ? 'none' : 'auto'}>
        {(['expense', 'income'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.toggleBtn, mode === m && { backgroundColor: colors.primary }]}>
            <Text style={[styles.toggleText, { color: mode === m ? '#fff' : colors.text }]}>
              {m === 'income' ? 'Income' : 'Expense'}
            </Text>
          </Pressable>
        ))}
      </View>
      {isEditing ? (
        <Text style={[styles.editHint, { color: colors.textMuted }]}>
          Type cannot be changed when editing. Delete and create a new entry if you need a different type.
        </Text>
      ) : null}

      <Text style={[styles.label, { color: colors.textMuted }]}>Amount (PHP)</Text>
      <CurrencyTextInput
        value={amount}
        onChangeText={setAmount}
        colors={colors}
        placeholder="0.00"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Optional"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>
      <Pressable
        onPress={() => setPickCategoryOpen(true)}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
        accessibilityRole="button"
        accessibilityLabel="Choose category">
        <Text style={{ color: category.trim() ? colors.text : colors.textMuted, fontSize: 16 }}>
          {category.trim() || 'Select category'}
        </Text>
      </Pressable>

      <DatePickerField
        label={mode === 'expense' && awaitingPayment ? 'Due date' : 'Date'}
        value={date}
        onChange={setDate}
        colors={colors}
      />

      <CategoryPickerModal
        visible={pickCategoryOpen}
        title={mode === 'income' ? 'Income category' : 'Expense category'}
        value={category}
        options={mode === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES}
        onSelect={(c) => {
          setCategory(c);
          setPickCategoryOpen(false);
        }}
        onClose={() => setPickCategoryOpen(false)}
      />

      {mode === 'expense' && (
        <>
          <View style={[styles.awaitRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.label, { color: colors.text, marginTop: 0, marginBottom: 4 }]}>
                Awaiting payment
              </Text>
              <Text style={[styles.awaitHint, { color: colors.textMuted }]}>
                {`Due checklist on Transactions. The date above is the due date. High-priority amounts count in Remaining Funds while awaiting; low-priority does not until marked paid.`}
              </Text>
            </View>
            <Switch
              value={awaitingPayment}
              onValueChange={setAwaitingPayment}
              trackColor={{ false: colors.border, true: `${colors.primary}88` }}
              thumbColor={awaitingPayment ? colors.primary : colors.surfaceSecondary}
            />
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Priority</Text>
          <View style={styles.prioRow}>
            <Pressable
              onPress={() => setPriority('high')}
              style={[
                styles.prioBtn,
                { borderColor: colors.border },
                priority === 'high' && { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
              ]}>
              <Text style={[styles.prioText, { color: colors.text }]}>High — needs</Text>
            </Pressable>
            <Pressable
              onPress={() => setPriority('low')}
              style={[
                styles.prioBtn,
                { borderColor: colors.border },
                priority === 'low' && { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
              ]}>
              <Text style={[styles.prioText, { color: colors.text }]}>Low — wants</Text>
            </Pressable>
          </View>
        </>
      )}

      <PrimaryButton
        title={isEditing ? 'Save changes' : 'Save'}
        onPress={submit}
        loading={loading}
        style={{ marginTop: 20 }}
      />

      <PostSaveModal
        visible={postSave !== null}
        title={postSave?.title ?? ''}
        message={postSave?.message ?? ''}
        onAddAnother={() => setPostSave(null)}
        onDone={() => {
          setPostSave(null);
          router.back();
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
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  editHint: { fontSize: 12, lineHeight: 17, marginBottom: 12, marginTop: -8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleText: { fontWeight: '700', fontSize: 15 },
  prioRow: {
    flexDirection: 'row',
    gap: 10,
  },
  prioBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  prioText: { fontWeight: '600' },
  awaitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  awaitHint: { fontSize: 12, lineHeight: 17 },
});
