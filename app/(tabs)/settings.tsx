import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import Feather from '@expo/vector-icons/Feather';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChevronIcon } from '@/components/ChevronIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IntegerTextInput } from '@/components/IntegerTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { ThemePreference } from '@/db/types';
import { getAppSettings } from '@/db/db';
import { useBudget } from '@/context/BudgetContext';
import { useFinpalDialog } from '@/context/FinpalDialogContext';
import { useFinpalTheme } from '@/context/FinpalThemeContext';
import {
  budgetRatesFromAllocationInputs,
  parseAllocationInputsFromSettings,
  savingsOfFundsRate,
} from '@/utils/budgetRates';
import { applyBackupJson, buildBackupJson } from '@/utils/backup';
import { formatIntegerAsTyped, parseIntegerInput } from '@/utils/currencyInput';

function CollapsibleRow({
  title,
  summary,
  expanded,
  onToggle,
  colors,
  nested,
}: {
  title: string;
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  colors: { text: string; textMuted: string; border: string; primary: string };
  nested?: boolean;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.collapsibleHead,
        nested && styles.collapsibleHeadNested,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${title}, ${expanded ? 'expanded' : 'collapsed'}`}>
      <View style={styles.collapsibleHeadText}>
        <Text style={[styles.collapsibleTitle, { color: colors.text }, nested && styles.collapsibleTitleNested]}>
          {title}
        </Text>
        {!expanded && summary ? (
          <Text style={[styles.collapsibleSummary, { color: colors.textMuted }]} numberOfLines={2}>
            {summary}
          </Text>
        ) : null}
      </View>
      <ChevronIcon direction={expanded ? 'up' : 'down'} size={16} color={colors.primary} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, preference, setPreference } = useFinpalTheme();
  const {
    settings,
    saveBudgetPeriodEndDay,
    saveBudgetAllocationRates,
    saveCarryoverSafeToSpend,
    saveLoanNotificationSettings,
    saveNotificationsEnabled,
    resetAllData,
    refresh,
  } = useBudget();
  const dialog = useFinpalDialog();

  const [busy, setBusy] = useState(false);

  const [openAppearance, setOpenAppearance] = useState(true);
  const [openBudget, setOpenBudget] = useState(false);
  const [openData, setOpenData] = useState(false);

  const [openPeriod, setOpenPeriod] = useState(false);
  const [openAllocation, setOpenAllocation] = useState(false);
  const [openCarryover, setOpenCarryover] = useState(false);
  const [openLoanNotify, setOpenLoanNotify] = useState(false);
  const [openAppNotify, setOpenAppNotify] = useState(false);
  const [openAboutBudget, setOpenAboutBudget] = useState(false);

  const [periodMode, setPeriodMode] = useState<'eom' | 'custom'>(
    settings.budgetPeriodEndDay === 0 ? 'eom' : 'custom'
  );
  const [periodDay, setPeriodDay] = useState(() =>
    formatIntegerAsTyped(String(settings.budgetPeriodEndDay === 0 ? 15 : settings.budgetPeriodEndDay))
  );

  const [allocDisposable, setAllocDisposable] = useState(() =>
    formatIntegerAsTyped(String(settings.budgetAllocationRaw.disposablePct))
  );
  const [allocFuture, setAllocFuture] = useState(() =>
    formatIntegerAsTyped(String(settings.budgetAllocationRaw.futurePct))
  );
  const [allocEmergency, setAllocEmergency] = useState(() =>
    formatIntegerAsTyped(String(settings.budgetAllocationRaw.emergencyPct))
  );
  const [allocTravel, setAllocTravel] = useState(() =>
    formatIntegerAsTyped(String(settings.budgetAllocationRaw.travelPct))
  );

  const [loanNotifyEnabled, setLoanNotifyEnabled] = useState(settings.loanNotifyEnabled);
  const [loanNotifyDaysBefore, setLoanNotifyDaysBefore] = useState(
    formatIntegerAsTyped(String(settings.loanNotifyDaysBefore))
  );
  const [loanNotifyTime, setLoanNotifyTime] = useState(settings.loanNotifyTime);
  const [appNotifyEnabled, setAppNotifyEnabled] = useState(settings.notificationsEnabled);

  React.useEffect(() => {
    setPeriodMode(settings.budgetPeriodEndDay === 0 ? 'eom' : 'custom');
    setPeriodDay(formatIntegerAsTyped(String(settings.budgetPeriodEndDay === 0 ? 15 : settings.budgetPeriodEndDay)));
  }, [settings.budgetPeriodEndDay]);

  React.useEffect(() => {
    const r = settings.budgetAllocationRaw;
    setAllocDisposable(formatIntegerAsTyped(String(r.disposablePct)));
    setAllocFuture(formatIntegerAsTyped(String(r.futurePct)));
    setAllocEmergency(formatIntegerAsTyped(String(r.emergencyPct)));
    setAllocTravel(formatIntegerAsTyped(String(r.travelPct)));
  }, [
    settings.budgetAllocationRaw.disposablePct,
    settings.budgetAllocationRaw.futurePct,
    settings.budgetAllocationRaw.emergencyPct,
    settings.budgetAllocationRaw.travelPct,
  ]);

  React.useEffect(() => {
    setLoanNotifyEnabled(settings.loanNotifyEnabled);
    setLoanNotifyDaysBefore(formatIntegerAsTyped(String(settings.loanNotifyDaysBefore)));
    setLoanNotifyTime(settings.loanNotifyTime);
  }, [settings.loanNotifyEnabled, settings.loanNotifyDaysBefore, settings.loanNotifyTime]);

  React.useEffect(() => {
    setAppNotifyEnabled(settings.notificationsEnabled);
  }, [settings.notificationsEnabled]);

  const previewRates = budgetRatesFromAllocationInputs(
    parseAllocationInputsFromSettings({
      disposable: String(parseIntegerInput(allocDisposable) || 0),
      future: String(parseIntegerInput(allocFuture) || 0),
      emergency: String(parseIntegerInput(allocEmergency) || 0),
      travel: String(parseIntegerInput(allocTravel) || 0),
    })
  );
  const savingsPct = Math.round(savingsOfFundsRate(previewRates) * 100);

  const periodSummary =
    settings.budgetPeriodEndDay === 0
      ? 'Calendar month (last day)'
      : `Custom close · day ${settings.budgetPeriodEndDay}`;

  const br = settings.budgetRates;
  const allocationSummary = `Disposable ${Math.round(br.disposableOfFunds * 100)}% · savings ${Math.round(savingsOfFundsRate(br) * 100)}% · F/E/T ${Math.round(br.futureOfSavings * 100)}/${Math.round(br.emergencyOfSavings * 100)}/${Math.round(br.travelOfSavings * 100)}`;

  const themeSummary = preference[0].toUpperCase() + preference.slice(1);

  const savePeriod = async () => {
    if (periodMode === 'eom') {
      setBusy(true);
      try {
        await saveBudgetPeriodEndDay(0);
        await dialog.alert('Saved', 'Budget period uses each calendar month (ends last day).');
      } finally {
        setBusy(false);
      }
      return;
    }
    const day = parseIntegerInput(periodDay);
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      await dialog.alert('Invalid day', 'Enter a closing day from 1 to 31.');
      return;
    }
    setBusy(true);
    try {
      await saveBudgetPeriodEndDay(day);
      await dialog.alert('Saved', 'Budget period closing day updated.');
    } finally {
      setBusy(false);
    }
  };

  const saveAllocation = async () => {
    const d = parseIntegerInput(allocDisposable);
    const f = parseIntegerInput(allocFuture);
    const e = parseIntegerInput(allocEmergency);
    const t = parseIntegerInput(allocTravel);
    if (!Number.isFinite(d) || d < 5 || d > 95) {
      await dialog.alert(
        'Disposable %',
        'Use a whole number from 5 to 95 (share of Remaining Funds for safe-to-spend).'
      );
      return;
    }
    if (![f, e, t].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) {
      await dialog.alert('Savings split', 'Future, emergency, and travel must be 0–100 each.');
      return;
    }
    if (f + e + t <= 0) {
      await dialog.alert(
        'Savings split',
        'At least one of future, emergency, or travel must be greater than zero.'
      );
      return;
    }
    setBusy(true);
    try {
      await saveBudgetAllocationRates({
        disposablePct: d,
        futurePct: f,
        emergencyPct: e,
        travelPct: t,
      });
      await dialog.alert('Saved', 'Budget allocation updated. Savings balances were recomputed.');
    } finally {
      setBusy(false);
    }
  };

  const saveLoanNotify = async () => {
    const d = parseIntegerInput(loanNotifyDaysBefore);
    if (!Number.isFinite(d) || d < 0 || d > 60) {
      await dialog.alert('Days before', 'Use a whole number from 0 to 60.');
      return;
    }
    const t = loanNotifyTime.trim();
    if (!/^\d{1,2}:\d{2}$/.test(t)) {
      await dialog.alert('Time', 'Use 24-hour time like 09:00 or 18:30.');
      return;
    }
    const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
    if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      await dialog.alert('Time', 'Hour must be 0–23 and minutes 00–59.');
      return;
    }
    setBusy(true);
    try {
      await saveLoanNotificationSettings({ enabled: loanNotifyEnabled, daysBefore: d, time: `${hh}:${String(mm).padStart(2, '0')}` });
      await dialog.alert('Saved', 'Loan reminders updated.');
    } finally {
      setBusy(false);
    }
  };

  const saveAppNotify = async () => {
    const wasEnabled = settings.notificationsEnabled;
    if (appNotifyEnabled) {
      const current = await Notifications.getPermissionsAsync();
      if (!current.granted) {
        const req = await Notifications.requestPermissionsAsync();
        if (!req.granted) {
          setAppNotifyEnabled(false);
          await saveNotificationsEnabled(false);
          await dialog.alert(
            'Notifications not enabled',
            'Permission was not granted. You can enable notifications later in system settings.',
          );
          return;
        }
      }
    }
    setBusy(true);
    try {
      await saveNotificationsEnabled(appNotifyEnabled);
      await dialog.alert('Saved', appNotifyEnabled ? 'App notifications enabled.' : 'App notifications disabled.');
      if (!wasEnabled && appNotifyEnabled && Platform.OS === 'android') {
        const ok = await dialog.confirm(
          'Disable battery optimization?',
          'To make reminders more reliable (especially when the app is closed), set Finpal to “Don’t optimize” in Android battery settings.',
          { cancelLabel: 'Not now', confirmLabel: 'Open settings' }
        );
        if (ok) {
          // Opens Android battery optimization settings screen.
          await IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
          );
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const exportData = async () => {
    setBusy(true);
    try {
      const json = await buildBackupJson();
      const d = new Date();
      const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
      const name = `finpal_backup-${ts}.finpal`;
      const dir = FileSystem.cacheDirectory;
      if (!dir) {
        await dialog.alert('Export failed', 'Cache directory is not available on this platform.');
        return;
      }
      const path = `${dir}${name}`;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      const can = await Sharing.isAvailableAsync();
      if (!can) {
        await dialog.alert('Sharing unavailable', 'Could not open share sheet on this device.');
        return;
      }
      await Sharing.shareAsync(path, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Export Finpal backup',
        UTI: 'public.data',
      });
    } catch (err) {
      await dialog.alert('Export failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const importData = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const uri = res.assets[0].uri;
      const raw = await FileSystem.readAsStringAsync(uri);
      const ok = await dialog.confirm('Replace all data?', 'This will overwrite local Finpal data with the backup file.', {
        cancelLabel: 'Cancel',
        confirmLabel: 'Import',
        destructive: true,
      });
      if (!ok) return;
      setBusy(true);
      try {
        await applyBackupJson(raw);
        await refresh();
        const next = await getAppSettings();
        await setPreference(next.themePreference);
        await dialog.alert('Done', 'Backup imported.');
      } catch (err) {
        await dialog.alert('Import failed', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setBusy(false);
      }
    } catch (err) {
      await dialog.alert('Import failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const doResetData = async () => {
    const ok = await dialog.confirm(
      'Reset all data?',
      'This will permanently delete all local Finpal data: settings, transactions, loans, savings bubbles, and accounts. This cannot be undone.',
      {
        cancelLabel: 'Cancel',
        confirmLabel: 'Reset',
        destructive: true,
      }
    );
    if (!ok) return;
    const ok2 = await dialog.confirm('Last warning', 'Are you absolutely sure? You will lose everything on this device.', {
      cancelLabel: 'Cancel',
      confirmLabel: 'Reset data',
      destructive: true,
    });
    if (!ok2) return;
    setBusy(true);
    try {
      await resetAllData();
      const next = await getAppSettings();
      await setPreference(next.themePreference);
      await dialog.alert('Reset complete', 'Finpal has been reset to a clean state.');
    } catch (err) {
      await dialog.alert('Reset failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const themeOptions: ThemePreference[] = ['system', 'light', 'dark'];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 40 }]}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>Settings</Text>
      <Text style={[styles.screenLead, { color: colors.textMuted }]}>Expand a section to change options.</Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CollapsibleRow
          title="Appearance"
          summary={themeSummary}
          expanded={openAppearance}
          onToggle={() => setOpenAppearance((v) => !v)}
          colors={colors}
        />
        {openAppearance ? (
          <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
            <Text style={[styles.inlineHint, { color: colors.textMuted }]}>Theme</Text>
            <View style={[styles.selectList, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
              {themeOptions.map((opt, i) => {
                const selected = preference === opt;
                const last = i === themeOptions.length - 1;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setPreference(opt)}
                    style={({ pressed }) => [
                      styles.selectRow,
                      !last && { borderBottomColor: colors.border },
                      last && styles.selectRowLast,
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}>
                    <Text style={[styles.selectRowLabel, { color: colors.text }]}>
                      {opt[0].toUpperCase() + opt.slice(1)}
                    </Text>
                    <View style={styles.selectRowTrail}>
                      {selected ? <Feather name="check" size={20} color={colors.primary} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CollapsibleRow
          title="System"
          summary={`Notifications ${settings.notificationsEnabled ? 'On' : 'Off'}`}
          expanded={openAppNotify}
          onToggle={() => setOpenAppNotify((v) => !v)}
          colors={colors}
        />
        {openAppNotify ? (
          <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
            <Text style={[styles.subHint, { color: colors.textMuted }]}>
              Master switch for all reminders: daily check-ins, savings target deadlines, and loan due notifications.
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 10 }]}>App notifications</Text>
            <View style={[styles.selectList, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
              <Pressable
                onPress={() => setAppNotifyEnabled(false)}
                style={({ pressed }) => [
                  styles.selectRow,
                  { borderBottomColor: colors.border },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: !appNotifyEnabled }}>
                <Text style={[styles.selectRowLabel, { color: colors.text }]}>Off</Text>
                <View style={styles.selectRowTrail}>
                  {!appNotifyEnabled ? <Feather name="check" size={20} color={colors.primary} /> : null}
                </View>
              </Pressable>
              <Pressable
                onPress={() => setAppNotifyEnabled(true)}
                style={({ pressed }) => [styles.selectRow, styles.selectRowLast, pressed && { opacity: 0.85 }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: appNotifyEnabled }}>
                <Text style={[styles.selectRowLabel, { color: colors.text }]}>On</Text>
                <View style={styles.selectRowTrail}>
                  {appNotifyEnabled ? <Feather name="check" size={20} color={colors.primary} /> : null}
                </View>
              </Pressable>
            </View>

            <PrimaryButton
              title="Save notifications"
              onPress={saveAppNotify}
              loading={busy}
              variant="outline"
              style={{ marginTop: 14 }}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CollapsibleRow
          title="Budget"
          summary={`${periodSummary} · ${allocationSummary}`}
          expanded={openBudget}
          onToggle={() => setOpenBudget((v) => !v)}
          colors={colors}
        />
        {openBudget ? (
          <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
            <CollapsibleRow
              title="Budget period"
              summary={periodSummary}
              expanded={openPeriod}
              onToggle={() => setOpenPeriod((v) => !v)}
              colors={colors}
              nested
            />
            {openPeriod ? (
              <View style={[styles.subBody, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.subHint, { color: colors.textMuted }]}>
                  Targets and safe-to-spend use this window. Loan month rollover stays on the calendar month.
                </Text>
                <View style={[styles.selectList, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Pressable
                    onPress={() => setPeriodMode('eom')}
                    style={({ pressed }) => [
                      styles.selectRow,
                      { borderBottomColor: colors.border },
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: periodMode === 'eom' }}>
                    <Text style={[styles.selectRowLabel, { color: colors.text }]}>Month end</Text>
                    <View style={styles.selectRowTrail}>
                      {periodMode === 'eom' ? <Feather name="check" size={20} color={colors.primary} /> : null}
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => setPeriodMode('custom')}
                    style={({ pressed }) => [
                      styles.selectRow,
                      styles.selectRowLast,
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: periodMode === 'custom' }}>
                    <Text style={[styles.selectRowLabel, { color: colors.text }]}>Custom day</Text>
                    <View style={styles.selectRowTrail}>
                      {periodMode === 'custom' ? <Feather name="check" size={20} color={colors.primary} /> : null}
                    </View>
                  </Pressable>
                </View>
                {periodMode === 'custom' ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Closing day (1–31)</Text>
                    <IntegerTextInput
                      value={periodDay}
                      onChangeText={setPeriodDay}
                      colors={colors}
                      style={styles.allocInput}
                    />
                  </View>
                ) : null}
                <PrimaryButton
                  title="Save budget period"
                  onPress={savePeriod}
                  loading={busy}
                  variant="outline"
                  style={{ marginTop: 14 }}
                />
              </View>
            ) : null}

            <CollapsibleRow
              title="Allocation percentages"
              summary={allocationSummary}
              expanded={openAllocation}
              onToggle={() => setOpenAllocation((v) => !v)}
              colors={colors}
              nested
            />
            {openAllocation ? (
              <View style={[styles.subBody, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.subHint, { color: colors.textMuted }]}>
                  Disposable share of Remaining Funds (5–95%). Savings weights are scaled to 100% of the savings
                  portion.
                </Text>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Disposable % of Remaining Funds</Text>
                <IntegerTextInput
                  value={allocDisposable}
                  onChangeText={setAllocDisposable}
                  colors={colors}
                  style={styles.allocInput}
                />
                <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 12 }]}>
                  Savings weights (0–100 each)
                </Text>
                <View style={styles.allocGrid}>
                  <View style={styles.allocCell}>
                    <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Future</Text>
                    <IntegerTextInput
                      value={allocFuture}
                      onChangeText={setAllocFuture}
                      colors={colors}
                      style={styles.allocInput}
                    />
                  </View>
                  <View style={styles.allocCell}>
                    <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Emergency</Text>
                    <IntegerTextInput
                      value={allocEmergency}
                      onChangeText={setAllocEmergency}
                      colors={colors}
                      style={styles.allocInput}
                    />
                  </View>
                  <View style={styles.allocCell}>
                    <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Travel</Text>
                    <IntegerTextInput
                      value={allocTravel}
                      onChangeText={setAllocTravel}
                      colors={colors}
                      style={styles.allocInput}
                    />
                  </View>
                </View>
                <View style={[styles.previewBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.previewTitle, { color: colors.text }]}>Preview</Text>
                  <Text style={[styles.previewLine, { color: colors.textMuted }]}>
                    Disposable {Math.round(previewRates.disposableOfFunds * 100)}% · Savings {savingsPct}% of Remaining
                    Funds
                  </Text>
                  <Text style={[styles.previewLine, { color: colors.textMuted }]}>
                    Of savings: Future {Math.round(previewRates.futureOfSavings * 100)}% · Emergency{' '}
                    {Math.round(previewRates.emergencyOfSavings * 100)}% · Travel{' '}
                    {Math.round(previewRates.travelOfSavings * 100)}%
                  </Text>
                </View>
                <PrimaryButton title="Save allocation" onPress={saveAllocation} loading={busy} style={{ marginTop: 14 }} />
              </View>
            ) : null}

            <CollapsibleRow
              title="Auto-save unspent safe-to-spend"
              summary={settings.carryoverSafeToSpend ? 'On' : 'Off'}
              expanded={openCarryover}
              onToggle={() => setOpenCarryover((v) => !v)}
              colors={colors}
              nested
            />
            {openCarryover ? (
              <View style={[styles.subBody, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.subHint, { color: colors.textMuted }]}>
                  Default is Off. When On, leftover safe-to-spend is swept into Savings → Future when a period closes.
                </Text>
                <View style={[styles.selectList, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Pressable
                    onPress={() => saveCarryoverSafeToSpend(false)}
                    style={({ pressed }) => [
                      styles.selectRow,
                      { borderBottomColor: colors.border },
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: !settings.carryoverSafeToSpend }}>
                    <Text style={[styles.selectRowLabel, { color: colors.text }]}>Off (no sweep)</Text>
                    <View style={styles.selectRowTrail}>
                      {!settings.carryoverSafeToSpend ? (
                        <Feather name="check" size={20} color={colors.primary} />
                      ) : null}
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => saveCarryoverSafeToSpend(true)}
                    style={({ pressed }) => [styles.selectRow, styles.selectRowLast, pressed && { opacity: 0.85 }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: settings.carryoverSafeToSpend }}>
                    <Text style={[styles.selectRowLabel, { color: colors.text }]}>On (sweep to Future)</Text>
                    <View style={styles.selectRowTrail}>
                      {settings.carryoverSafeToSpend ? (
                        <Feather name="check" size={20} color={colors.primary} />
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <CollapsibleRow
              title="Loan reminders"
              summary={
                `${settings.loanNotifyEnabled ? 'On' : 'Off'} · ${settings.loanNotifyDaysBefore} day${settings.loanNotifyDaysBefore === 1 ? '' : 's'} · ${settings.loanNotifyTime}`
              }
              expanded={openLoanNotify}
              onToggle={() => setOpenLoanNotify((v) => !v)}
              colors={colors}
              nested
            />
            {openLoanNotify ? (
              <View style={[styles.subBody, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.subHint, { color: colors.textMuted }]}>
                  Get a local notification before each loan due date. Applies to recurring loans using their scheduled dates.
                </Text>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Enabled</Text>
                <View style={[styles.selectList, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Pressable
                    onPress={() => setLoanNotifyEnabled(false)}
                    style={({ pressed }) => [
                      styles.selectRow,
                      { borderBottomColor: colors.border },
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: !loanNotifyEnabled }}>
                    <Text style={[styles.selectRowLabel, { color: colors.text }]}>Off</Text>
                    <View style={styles.selectRowTrail}>
                      {!loanNotifyEnabled ? <Feather name="check" size={20} color={colors.primary} /> : null}
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => setLoanNotifyEnabled(true)}
                    style={({ pressed }) => [styles.selectRow, styles.selectRowLast, pressed && { opacity: 0.85 }]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: loanNotifyEnabled }}>
                    <Text style={[styles.selectRowLabel, { color: colors.text }]}>On</Text>
                    <View style={styles.selectRowTrail}>
                      {loanNotifyEnabled ? <Feather name="check" size={20} color={colors.primary} /> : null}
                    </View>
                  </Pressable>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Days before due date (0–60)</Text>
                  <IntegerTextInput
                    value={loanNotifyDaysBefore}
                    onChangeText={setLoanNotifyDaysBefore}
                    colors={colors}
                    style={styles.allocInput}
                  />
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Time (24h, HH:MM)</Text>
                  <TextInput
                    value={loanNotifyTime}
                    onChangeText={setLoanNotifyTime}
                    placeholder="09:00"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="numeric"
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                    ]}
                  />
                </View>

                <PrimaryButton
                  title="Save loan reminders"
                  onPress={saveLoanNotify}
                  loading={busy}
                  variant="outline"
                  style={{ marginTop: 14 }}
                />
              </View>
            ) : null}

            <CollapsibleRow
              title="How budgeting works"
              expanded={openAboutBudget}
              onToggle={() => setOpenAboutBudget((v) => !v)}
              colors={colors}
              nested
            />
            {openAboutBudget ? (
              <View style={[styles.subBody, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.aboutText, { color: colors.textMuted }]}>
                  Remaining Funds = period income minus high-priority outflow (including high-priority bills awaiting
                  payment by due date, plus every loan’s monthly repayment). The remainder splits into disposable
                  (safe-to-spend budget) and savings. Savings is split across future, emergency, and travel using your
                  weights. Running savings balances sum those splits over past periods from your history, not per
                  deposit. Low-priority spending only reduces safe-to-spend, not the three savings buckets.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CollapsibleRow
          title="Backup & restore"
          summary="Export or import JSON"
          expanded={openData}
          onToggle={() => setOpenData((v) => !v)}
          colors={colors}
        />
        {openData ? (
          <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
            <Text style={[styles.inlineHint, { color: colors.textMuted }]}>
              Full backup: settings, transactions, loans.
            </Text>
            <PrimaryButton title="Export JSON" onPress={exportData} loading={busy} style={{ marginBottom: 10 }} />
            <PrimaryButton title="Import JSON" variant="outline" onPress={importData} disabled={busy} />

            <View style={{ height: 18 }} />
            <Text style={[styles.inlineHint, { color: colors.textMuted, marginBottom: 8 }]}>
              Danger zone
            </Text>
            <Text style={[styles.subHint, { color: colors.textMuted, marginBottom: 10 }]}>
              Reset will permanently delete all local data on this device. Export a backup first if you want to keep it.
            </Text>
            <PrimaryButton
              title="Reset all data"
              variant="outline"
              onPress={doResetData}
              disabled={busy}
              textStyle={{ color: colors.danger }}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  screenTitle: { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  screenLead: { fontSize: 14, lineHeight: 20, marginBottom: 18 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  collapsibleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  collapsibleHeadNested: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    marginTop: 4,
    borderRadius: 12,
  },
  collapsibleHeadText: { flex: 1 },
  collapsibleTitle: { fontSize: 17, fontWeight: '800' },
  collapsibleTitleNested: { fontSize: 15, fontWeight: '700' },
  collapsibleSummary: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  cardBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  subBody: {
    marginHorizontal: 4,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
  },
  inlineHint: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  subHint: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  aboutText: { fontSize: 13, lineHeight: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  miniLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  selectList: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectRowLabel: { flex: 1, fontSize: 16 },
  selectRowTrail: { width: 28, alignItems: 'flex-end', justifyContent: 'center' },
  selectRowLast: { borderBottomWidth: 0 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  allocInput: { marginTop: 0 },
  allocGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  allocCell: { flex: 1, minWidth: 100 },
  previewBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  previewTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  previewLine: { fontSize: 12, lineHeight: 18 },
});
