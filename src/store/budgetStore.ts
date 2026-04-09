import { create } from 'zustand';

import type {
  AccountRow,
  AppSettings,
  BudgetAllocationInputs,
  LoanRow,
  SafeToSpendMoveRow,
  SavingsBubbleRow,
  TransactionRow,
} from '@/db/types';
import { syncBubbleTargetReminders } from '@/notifications/bubbleTargetReminders';
import { syncDailyLogReminders } from '@/notifications/dailyLogReminders';
import { syncLoanDueNotifications } from '@/notifications/loanDueNotifications';
import {
  addExpenseTransaction,
  addIncomeTransaction,
  addLoan,
  adjustSavingsBubbleBalance,
  createAccount as dbCreateAccount,
  createSavingsBubble,
  transferBetweenBubbles,
  updateSavingsBubble,
  updateLoan,
  deleteLoan,
  deleteTransaction,
  getAccounts,
  getAppSettings,
  getDatabase,
  getLoans,
  getSafeToSpendMoves,
  getSavingsBubbles,
  getSavingsBalances,
  getTransactions,
  setSetting,
  linkAccountToBubble,
  linkAccountToSystemBucket,
  transferBetweenAccountAndBubble,
  unlinkAccount,
  updateAccountBalance as dbUpdateAccountBalance,
  addSafeToSpendMove,
  resetAllData as dbResetAllData,
  updateNotificationsEnabled,
  updateCarryoverSafeToSpend,
  markExpensePaid as persistExpensePaid,
  markExpenseUnpaid as persistExpenseUnpaid,
  markLoanRepaymentAcknowledged as persistLoanRepaymentAcknowledged,
  markLoanRepaymentUnacknowledged as persistLoanRepaymentUnacknowledged,
  updateBudgetAllocationRates,
  updateBudgetPeriodEndDay,
  updateLoanNotificationSettings,
  updateTransaction as persistUpdateTransaction,
  type AddExpenseInput,
  type AddIncomeInput,
  type AddLoanInput,
  type UpdateTransactionInput,
} from '@/db/db';
import { DEFAULT_ALLOCATION_INPUTS, DEFAULT_BUDGET_RATES } from '@/utils/budgetRates';

export interface SavingsState {
  emergency: number;
  travel: number;
  standard: number;
  disposable: number;
}

export interface BudgetState {
  ready: boolean;
  settings: AppSettings;
  savings: SavingsState;
  transactions: TransactionRow[];
  loans: LoanRow[];
  bubbles: SavingsBubbleRow[];
  accounts: AccountRow[];
  safeToSpendMoves: SafeToSpendMoveRow[];

  refresh: () => Promise<void>;
  refreshBubblesAccounts: () => Promise<void>;
  createBubble: (input: {
    name: string;
    target_amount: number;
    target_date?: string | null;
    remind_enabled?: number;
    remind_time?: string | null;
  }) => Promise<void>;
  updateBubble: (
    id: number,
    input: {
      name: string;
      target_amount: number;
      target_date?: string | null;
      remind_enabled?: number;
      remind_time?: string | null;
    }
  ) => Promise<void>;
  depositToBubbleFromSafeToSpend: (input: { bubbleId: number; amount: number; date: string }) => Promise<void>;
  withdrawFromBubbleToSafeToSpend: (input: { bubbleId: number; amount: number; date: string }) => Promise<void>;
  transferBetweenBubbles: (input: { fromBubbleId: number; toBubbleId: number; amount: number }) => Promise<void>;
  createAccount: (input: { name: string; balance: number }) => Promise<void>;
  updateAccountBalance: (id: number, balance: number) => Promise<void>;
  linkAccountToBubble: (accountId: number, bubbleId: number) => Promise<void>;
  linkAccountToSystemBucket: (accountId: number, bucket: 'future' | 'emergency' | 'travel') => Promise<void>;
  unlinkAccount: (accountId: number) => Promise<void>;
  transferBetweenAccountAndBubble: (input: { accountId: number; bubbleId: number; amount: number }) => Promise<void>;
  resetAllData: () => Promise<void>;
  addIncome: (input: AddIncomeInput) => Promise<void>;
  addExpense: (input: AddExpenseInput) => Promise<void>;
  removeTransaction: (id: number) => Promise<void>;
  markExpensePaid: (id: number) => Promise<void>;
  markExpenseUnpaid: (id: number) => Promise<void>;
  markLoanRepaymentAcknowledged: (id: number) => Promise<void>;
  markLoanRepaymentUnacknowledged: (id: number) => Promise<void>;
  addLoanRow: (input: AddLoanInput) => Promise<void>;
  updateLoanRow: (id: number, input: AddLoanInput) => Promise<void>;
  removeLoan: (id: number) => Promise<void>;
  saveBudgetPeriodEndDay: (day: number) => Promise<void>;
  saveCarryoverSafeToSpend: (enabled: boolean) => Promise<void>;
  saveLoanNotificationSettings: (input: { enabled: boolean; daysBefore: number; time: string }) => Promise<void>;
  saveNotificationsEnabled: (enabled: boolean) => Promise<void>;
  updateTransactionRow: (id: number, input: UpdateTransactionInput) => Promise<void>;
  saveBudgetAllocationRates: (input: BudgetAllocationInputs) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  themePreference: 'system',
  onboardingDone: false,
  notificationsEnabled: true,
  budgetPeriodEndDay: 0,
  carryoverSafeToSpend: false,
  loanNotifyEnabled: true,
  loanNotifyDaysBefore: 3,
  loanNotifyTime: '09:00',
  budgetRates: DEFAULT_BUDGET_RATES,
  budgetAllocationRaw: DEFAULT_ALLOCATION_INPUTS,
};

let notificationSyncInFlight: Promise<void> | null = null;
function triggerNotificationSync(loans: LoanRow[], settings: AppSettings) {
  notificationSyncInFlight =
    notificationSyncInFlight?.catch(() => undefined).then(() =>
      syncLoanDueNotifications(loans, {
        enabled: settings.notificationsEnabled && settings.loanNotifyEnabled,
        daysBefore: settings.loanNotifyDaysBefore,
        time: settings.loanNotifyTime,
      })
    ) ?? null;
}

let bubbleNotificationSyncInFlight: Promise<void> | null = null;
function triggerBubbleReminderSync(bubbles: SavingsBubbleRow[], settings: AppSettings) {
  bubbleNotificationSyncInFlight =
    bubbleNotificationSyncInFlight?.catch(() => undefined).then(() => syncBubbleTargetReminders(bubbles, settings.notificationsEnabled)) ?? null;
}

let dailyLogSyncInFlight: Promise<void> | null = null;
function triggerDailyLogReminderSync(settings: AppSettings) {
  dailyLogSyncInFlight =
    dailyLogSyncInFlight?.catch(() => undefined).then(() => syncDailyLogReminders(settings.notificationsEnabled)) ?? null;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  ready: false,
  settings: defaultSettings,
  savings: { emergency: 0, travel: 0, standard: 0, disposable: 0 },
  transactions: [],
  loans: [],
  bubbles: [],
  accounts: [],
  safeToSpendMoves: [],

  refresh: async () => {
    await getDatabase();
    const s = await getAppSettings();
    const bal = await getSavingsBalances();
    const tx = await getTransactions();
    const ln = await getLoans();
    const [bub, acc, moves] = await Promise.all([getSavingsBubbles(), getAccounts(), getSafeToSpendMoves()]);
    set({
      settings: s,
      savings: bal,
      transactions: tx,
      loans: ln,
      bubbles: bub,
      accounts: acc,
      safeToSpendMoves: moves,
      ready: true,
    });
    triggerNotificationSync(ln, s);
    triggerBubbleReminderSync(bub, s);
    triggerDailyLogReminderSync(s);
  },

  refreshBubblesAccounts: async () => {
    const [bub, acc, moves] = await Promise.all([getSavingsBubbles(), getAccounts(), getSafeToSpendMoves()]);
    set({ bubbles: bub, accounts: acc, safeToSpendMoves: moves });
    triggerBubbleReminderSync(bub, get().settings);
  },

  createBubble: async (input) => {
    await createSavingsBubble(input);
    await get().refreshBubblesAccounts();
  },

  updateBubble: async (id, input) => {
    await updateSavingsBubble(id, input);
    await get().refreshBubblesAccounts();
  },

  depositToBubbleFromSafeToSpend: async ({ bubbleId, amount, date }) => {
    // Reduce safe-to-spend without affecting income/expense history.
    await addSafeToSpendMove({ amount: -Math.abs(amount), date, bubble_id: bubbleId, kind: 'deposit' });
    await adjustSavingsBubbleBalance(bubbleId, amount);
    await get().refresh();
  },

  withdrawFromBubbleToSafeToSpend: async ({ bubbleId, amount, date }) => {
    // Increase safe-to-spend without affecting income/expense history.
    await addSafeToSpendMove({ amount: Math.abs(amount), date, bubble_id: bubbleId, kind: 'withdraw' });
    await adjustSavingsBubbleBalance(bubbleId, -amount);
    await get().refresh();
  },

  transferBetweenBubbles: async (input) => {
    await transferBetweenBubbles(input);
    await get().refreshBubblesAccounts();
  },

  createAccount: async (input) => {
    await dbCreateAccount(input);
    await get().refreshBubblesAccounts();
  },

  updateAccountBalance: async (id, balance) => {
    await dbUpdateAccountBalance(id, balance);
    await get().refreshBubblesAccounts();
  },

  linkAccountToBubble: async (accountId, bubbleId) => {
    await linkAccountToBubble(accountId, bubbleId);
    await get().refreshBubblesAccounts();
  },

  linkAccountToSystemBucket: async (accountId, bucket) => {
    await linkAccountToSystemBucket(accountId, bucket);
    await get().refreshBubblesAccounts();
  },

  unlinkAccount: async (accountId) => {
    await unlinkAccount(accountId);
    await get().refreshBubblesAccounts();
  },

  transferBetweenAccountAndBubble: async (input) => {
    await transferBetweenAccountAndBubble(input);
    await get().refreshBubblesAccounts();
  },

  resetAllData: async () => {
    await dbResetAllData();
    await get().refresh();
  },

  addIncome: async (input) => {
    await addIncomeTransaction(input);
    await get().refresh();
  },
  addExpense: async (input) => {
    await addExpenseTransaction(input);
    await get().refresh();
  },
  removeTransaction: async (id) => {
    await deleteTransaction(id);
    await get().refresh();
  },
  markExpensePaid: async (id) => {
    await persistExpensePaid(id);
    await get().refresh();
  },
  markExpenseUnpaid: async (id) => {
    await persistExpenseUnpaid(id);
    await get().refresh();
  },
  markLoanRepaymentAcknowledged: async (id) => {
    await persistLoanRepaymentAcknowledged(id);
    await get().refresh();
  },
  markLoanRepaymentUnacknowledged: async (id) => {
    await persistLoanRepaymentUnacknowledged(id);
    await get().refresh();
  },
  addLoanRow: async (input) => {
    await addLoan(input);
    await get().refresh();
  },
  updateLoanRow: async (id, input) => {
    await updateLoan(id, input);
    await get().refresh();
  },
  removeLoan: async (id) => {
    await deleteLoan(id);
    await get().refresh();
  },
  saveBudgetPeriodEndDay: async (day) => {
    await updateBudgetPeriodEndDay(day);
    await get().refresh();
  },
  saveCarryoverSafeToSpend: async (enabled) => {
    await updateCarryoverSafeToSpend(enabled);
    await get().refresh();
  },
  saveLoanNotificationSettings: async (input) => {
    await updateLoanNotificationSettings(input);
    await get().refresh();
  },
  saveNotificationsEnabled: async (enabled) => {
    await updateNotificationsEnabled(enabled);
    await get().refresh();
  },
  updateTransactionRow: async (id, input) => {
    await persistUpdateTransaction(id, input);
    await get().refresh();
  },
  saveBudgetAllocationRates: async (input) => {
    await updateBudgetAllocationRates(input);
    await get().refresh();
  },

  completeOnboarding: async () => {
    await setSetting('onboarding_done', '1');
    await get().refresh();
  },
}));

