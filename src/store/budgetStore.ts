import { create } from 'zustand';

import type { AppSettings, BudgetAllocationInputs, LoanRow, TransactionRow } from '@/db/types';
import { syncLoanDueNotifications } from '@/notifications/loanDueNotifications';
import {
  addExpenseTransaction,
  addIncomeTransaction,
  addLoan,
  updateLoan,
  deleteLoan,
  deleteTransaction,
  getAppSettings,
  getDatabase,
  getLoans,
  getSavingsBalances,
  getTransactions,
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

  refresh: () => Promise<void>;
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
  updateTransactionRow: (id: number, input: UpdateTransactionInput) => Promise<void>;
  saveBudgetAllocationRates: (input: BudgetAllocationInputs) => Promise<void>;
}

const defaultSettings: AppSettings = {
  themePreference: 'system',
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
        enabled: settings.loanNotifyEnabled,
        daysBefore: settings.loanNotifyDaysBefore,
        time: settings.loanNotifyTime,
      })
    ) ?? null;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  ready: false,
  settings: defaultSettings,
  savings: { emergency: 0, travel: 0, standard: 0, disposable: 0 },
  transactions: [],
  loans: [],

  refresh: async () => {
    await getDatabase();
    const s = await getAppSettings();
    const bal = await getSavingsBalances();
    const tx = await getTransactions();
    const ln = await getLoans();
    set({ settings: s, savings: bal, transactions: tx, loans: ln, ready: true });
    triggerNotificationSync(ln, s);
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
  updateTransactionRow: async (id, input) => {
    await persistUpdateTransaction(id, input);
    await get().refresh();
  },
  saveBudgetAllocationRates: async (input) => {
    await updateBudgetAllocationRates(input);
    await get().refresh();
  },
}));

