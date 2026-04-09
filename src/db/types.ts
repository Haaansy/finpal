import type { BudgetAllocationInputs, BudgetRates } from '@/utils/budgetRates';

export type TransactionType = 'income' | 'expense';
export type ExpensePriority = 'high' | 'low';

export type ThemePreference = 'system' | 'light' | 'dark';

/** 0 = full calendar month; 1–31 = rolling period closing on that day (clamped in short months). */
export type BudgetPeriodEndDay = number;

export interface AppSettings {
  themePreference: ThemePreference;
  budgetPeriodEndDay: BudgetPeriodEndDay;
  /** When true, unspent safe-to-spend carries forward across periods. */
  carryoverSafeToSpend: boolean;
  loanNotifyEnabled: boolean;
  /** Days before loan due date to notify. */
  loanNotifyDaysBefore: number;
  /** Local time to notify, "HH:MM" (24h). */
  loanNotifyTime: string;
  /** Normalized rates used for balances and targets. */
  budgetRates: BudgetRates;
  /** Raw percentage inputs as stored (Settings UI). */
  budgetAllocationRaw: BudgetAllocationInputs;
}

export interface TransactionRow {
  id: number;
  amount: number;
  description: string | null;
  type: TransactionType;
  priority: ExpensePriority | null;
  category: string | null;
  date: string;
  /** When set with is_paid 0, expense appears in due checklist only until paid. */
  due_date: string | null;
  /** 1 = settled (counts toward budget); 0 = unpaid bill. */
  is_paid: number;
  emergency_alloc: number | null;
  travel_alloc: number | null;
  /** Future savings bucket (legacy column name `standard` in DB). */
  standard_alloc: number | null;
  disposable_alloc: number | null;
}

export interface LoanRow {
  id: number;
  name: string;
  total_amount: number;
  monthly_repayment: number;
  months_left: number;
  /** Next / anchor repayment calendar date (YYYY-MM-DD). */
  repayment_date: string | null;
  /** 1 = recurring monthly payment; 0 = one-off / manual schedule. */
  is_recurring: number;
  /** YYYY-MM when user marked this month’s installment on the checklist (null = not yet this month). */
  repayment_acknowledged_ym: string | null;
}

export interface SavingsBalances {
  emergency: number;
  travel: number;
  /** Future savings (DB column `standard`). */
  standard: number;
  disposable: number;
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  settings: Record<string, string>;
  transactions: Omit<TransactionRow, 'id'>[];
  loans: Omit<LoanRow, 'id'>[];
  savings_balances: SavingsBalances;
}

export type { BudgetAllocationInputs, BudgetRates } from '@/utils/budgetRates';
