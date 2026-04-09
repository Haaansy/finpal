import { ChevronIcon } from '@/components/ChevronIcon';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyTextInput } from '@/components/CurrencyTextInput';
import { DatePickerField } from '@/components/DatePickerField';
import { IntegerTextInput } from '@/components/IntegerTextInput';
import { PostSaveModal } from '@/components/PostSaveModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useBudget } from '@/context/BudgetContext';
import { useFinpalDialog } from '@/context/FinpalDialogContext';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import { formatCurrencyAsTyped, parseCurrencyInput, parseIntegerInput } from '@/utils/currencyInput';
import { parseIsoToDate } from '@/utils/dates';

export default function LoanEntryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useFinpalTheme();
  const dialog = useFinpalDialog();
  const { addIncome, addLoanRow, updateLoanRow, loans, ready } = useBudget();
  const params = useLocalSearchParams<{ editId?: string | string[] }>();
  const editIdRaw = params.editId;
  const editIdStr = Array.isArray(editIdRaw) ? editIdRaw[0] : editIdRaw;
  const editingId = editIdStr ? Number(editIdStr) : NaN;
  const isEditing = Number.isFinite(editingId) && editingId > 0;

  const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [monthly, setMonthly] = useState('');
  const [monthsLeft, setMonthsLeft] = useState('');
  const [repaymentDate, setRepaymentDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [recordProceedsIncome, setRecordProceedsIncome] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dateFieldKey, setDateFieldKey] = useState(0);
  const [postSaveVisible, setPostSaveVisible] = useState(false);
  const hydratedRef = useRef<number | null>(null);

  const resetForm = () => {
    setName('');
    setTotal('');
    setMonthly('');
    setMonthsLeft('');
    setRepaymentDate('');
    setIsRecurring(true);
    setRecordProceedsIncome(true);
    setDateFieldKey((k) => k + 1);
  };

  useEffect(() => {
    if (!ready || !isEditing) {
      if (!isEditing) hydratedRef.current = null;
      return;
    }
    const loan = loans.find((l) => l.id === editingId);
    if (!loan) {
      void (async () => {
        await dialog.alert('Not found', 'This loan is no longer available.');
        router.back();
      })();
      return;
    }
    if (hydratedRef.current === editingId) return;
    hydratedRef.current = editingId;
    setName(loan.name);
    setTotal(formatCurrencyAsTyped(String(loan.total_amount)));
    setMonthly(formatCurrencyAsTyped(String(loan.monthly_repayment)));
    setMonthsLeft(String(loan.months_left));
    setRepaymentDate(loan.repayment_date ?? '');
    setIsRecurring((loan.is_recurring ?? 1) !== 0);
    setDateFieldKey((k) => k + 1);
  }, [ready, isEditing, editingId, loans, dialog]);

  const submit = async () => {
    const t = parseCurrencyInput(total);
    const m = parseCurrencyInput(monthly);
    const mo = isRecurring ? parseIntegerInput(monthsLeft) : 1;
    if (!name.trim()) {
      await dialog.alert('Name required', 'Enter a name for this loan.');
      return;
    }
    if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(m) || m <= 0) {
      await dialog.alert('Check numbers', 'Total and monthly repayment must be positive.');
      return;
    }
    if (isRecurring && (!Number.isFinite(mo) || mo < 0)) {
      await dialog.alert('Check numbers', 'Months remaining must be 0 or more.');
      return;
    }
    const rd = repaymentDate.trim();
    if (rd && !parseIsoToDate(rd)) {
      await dialog.alert('Repayment date', 'Choose a valid date or clear the field.');
      return;
    }
    if (!isRecurring && (!rd || !parseIsoToDate(rd))) {
      await dialog.alert('Repayment date', 'One-off loans need a valid due date for the checklist.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        total_amount: t,
        monthly_repayment: m,
        months_left: isRecurring ? mo : 1,
        repayment_date: rd || null,
        is_recurring: isRecurring,
      };
      if (isEditing) {
        await updateLoanRow(editingId, payload);
        resetForm();
        hydratedRef.current = null;
        router.back();
        return;
      }
      if (recordProceedsIncome) {
        await addIncome({
          amount: t,
          date: todayIso(),
          category: 'Loans',
          description: `Loan proceeds: ${name.trim()}`,
        });
      }
      await addLoanRow(payload);
      resetForm();
      setPostSaveVisible(true);
    } catch (e) {
      await dialog.alert('Error', e instanceof Error ? e.message : 'Failed');
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
      <Text style={[styles.title, { color: colors.text }]}>{isEditing ? 'Edit loan' : 'Add loan'}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Monthly repayment counts toward high-priority outflows. For one-off loans, the due date controls when the
        repayment appears on your checklist. Recurring loans without a date get the next same calendar day in a month
        automatically.
      </Text>

      <Text style={[styles.label, { color: colors.textMuted }]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Car loan"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Total amount (PHP)</Text>
      <CurrencyTextInput
        value={total}
        onChangeText={setTotal}
        colors={colors}
        placeholder="0.00"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Monthly repayment (PHP)</Text>
      <CurrencyTextInput
        value={monthly}
        onChangeText={setMonthly}
        colors={colors}
        placeholder="0.00"
        placeholderTextColor={colors.textMuted}
      />

      <View style={[styles.recRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[styles.recTitle, { color: colors.text }]}>Recurring monthly</Text>
          <Text style={[styles.recHint, { color: colors.textMuted }]}>
            Off for a one-off payment — set a due date; it will show on the checklist from that month until you mark
            it paid.
          </Text>
        </View>
        <Switch
          value={isRecurring}
          onValueChange={(v) => {
            setIsRecurring(v);
            if (!v) setMonthsLeft('1');
          }}
          trackColor={{ false: colors.border, true: `${colors.primary}88` }}
          thumbColor={isRecurring ? colors.primary : colors.surfaceSecondary}
        />
      </View>

      <DatePickerField
        key={dateFieldKey}
        label="Repayment date"
        value={repaymentDate}
        onChange={setRepaymentDate}
        colors={colors}
        optional={isRecurring}
      />
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        {isRecurring
          ? 'Optional. If empty, the next due date is chosen automatically (same day next month).'
          : 'Required. The checklist includes this loan from the due month until you mark it paid.'}
      </Text>

      <Text
        style={[
          styles.label,
          { color: colors.textMuted, opacity: isRecurring ? 1 : 0.45 },
        ]}>
        Months remaining
      </Text>
      <IntegerTextInput
        value={isRecurring ? monthsLeft : '1'}
        onChangeText={setMonthsLeft}
        colors={colors}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        editable={isRecurring}
        style={{ opacity: isRecurring ? 1 : 0.55 }}
      />
      {!isRecurring ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          One-off loans always use 1 payment in the budget until you tick them paid on the checklist.
        </Text>
      ) : null}

      {!isEditing ? (
        <View style={[styles.recRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.recTitle, { color: colors.text }]}>Record loan as income</Text>
            <Text style={[styles.recHint, { color: colors.textMuted }]}>
              Adds an income transaction for the loan proceeds when you save this loan.
            </Text>
          </View>
          <Switch
            value={recordProceedsIncome}
            onValueChange={setRecordProceedsIncome}
            trackColor={{ false: colors.border, true: `${colors.primary}88` }}
            thumbColor={recordProceedsIncome ? colors.primary : colors.surfaceSecondary}
          />
        </View>
      ) : null}

      <PrimaryButton
        title={isEditing ? 'Save changes' : 'Save loan'}
        onPress={submit}
        loading={loading}
        style={{ marginTop: 20 }}
      />

      <PostSaveModal
        visible={postSaveVisible}
        title="Loan saved"
        message="The form is ready for another loan, or you can return to your list."
        addAnotherLabel="Add another loan"
        onAddAnother={() => setPostSaveVisible(false)}
        onDone={() => {
          setPostSaveVisible(false);
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
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  sub: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  hint: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  recTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  recHint: { fontSize: 12, lineHeight: 17 },
});
