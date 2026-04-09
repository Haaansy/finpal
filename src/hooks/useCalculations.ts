import { useMemo } from 'react';

import type { LoanRow, TransactionRow } from '@/db/types';
import type { BudgetRates } from '@/utils/budgetRates';
import { useBudget } from '@/context/BudgetContext';
import { formatIsoDateEnPh } from '@/utils/dates';
import {
  computeFunds,
  computeSafeToSpend,
  computeSafeToSpendCarryover,
  describeBudgetPeriodRule,
  disposableBudgetFromFunds,
  filterTransactionsForMonth,
  getBudgetPeriodRange,
  periodBucketTargetsFromFunds,
  savingsPoolFromFunds,
  sumHighPriorityExpensesForMonth,
  sumIncomeForMonth,
  sumLowPriorityExpensesForMonth,
  sumPaidHighPriorityExpensesForMonth,
  sumUnpaidHighPriorityExpensesForMonth,
  periodHighPriorityOutflow,
  totalMonthlyLoanRepaymentsAll,
} from '@/utils/calculations';

export type CalculationsSnapshot = {
  range: { start: string; end: string };
  monthTransactions: TransactionRow[];
  incomeMonth: number;
  highPriMonth: number;
  highPriBillsTotal: number;
  highPriExpensesMonth: number;
  unpaidHighPriExpensesMonth: number;
  lowPriMonth: number;
  loanPay: number;
  funds: number;
  savingsPool: number;
  disposableBudget: number;
  bucketTargets: ReturnType<typeof periodBucketTargetsFromFunds>;
  safeToSpend: number;
  periodRuleText: string;
  periodEndFormatted: string;
  periodRangeFormatted: string;
};

export function buildCalculationsSnapshot(
  transactions: TransactionRow[],
  loans: LoanRow[],
  budgetPeriodEndDay: number,
  budgetRates: BudgetRates,
  anchorDate: Date,
  opts?: { carryoverSafeToSpend?: boolean }
): CalculationsSnapshot {
  const range = getBudgetPeriodRange(budgetPeriodEndDay, anchorDate);
  const monthTx = filterTransactionsForMonth(transactions, range);
  const incomeMonth = sumIncomeForMonth(transactions, range);
  const highPriBillsTotal = sumHighPriorityExpensesForMonth(transactions, range);
  const highPriExpensesMonth = sumPaidHighPriorityExpensesForMonth(transactions, range);
  const unpaidHighPriExpensesMonth = sumUnpaidHighPriorityExpensesForMonth(transactions, range);
  const loanPay = totalMonthlyLoanRepaymentsAll(loans);
  const highPriTotal = periodHighPriorityOutflow(transactions, loans, range);
  const highPriMonth = highPriTotal;
  const lowPriMonth = sumLowPriorityExpensesForMonth(transactions, range);
  const funds = computeFunds(incomeMonth, highPriTotal);
  const savingsPool = savingsPoolFromFunds(funds, budgetRates);
  const disposableBudget = disposableBudgetFromFunds(funds, budgetRates);
  const bucketTargets = periodBucketTargetsFromFunds(funds, budgetRates);
  const safeToSpend = opts?.carryoverSafeToSpend
    ? computeSafeToSpendCarryover(transactions, loans, budgetPeriodEndDay, budgetRates, range.end)
    : computeSafeToSpend(transactions, loans, range, budgetRates);
  const periodRuleText = describeBudgetPeriodRule(budgetPeriodEndDay);
  const periodEndFormatted = formatIsoDateEnPh(range.end);
  const periodRangeFormatted = `${formatIsoDateEnPh(range.start)} – ${periodEndFormatted}`;

  return {
    range,
    monthTransactions: monthTx,
    incomeMonth,
    highPriMonth,
    highPriBillsTotal,
    highPriExpensesMonth,
    unpaidHighPriExpensesMonth,
    lowPriMonth,
    loanPay,
    funds,
    savingsPool,
    disposableBudget,
    bucketTargets,
    safeToSpend,
    periodRuleText,
    periodEndFormatted,
    periodRangeFormatted,
  };
}

export function useCalculations() {
  const { transactions, settings, loans, ready } = useBudget();

  return useMemo(() => {
    const snapshot = buildCalculationsSnapshot(
      transactions,
      loans,
      settings.budgetPeriodEndDay,
      settings.budgetRates,
      new Date(),
      { carryoverSafeToSpend: settings.carryoverSafeToSpend }
    );
    return { ready, ...snapshot };
  }, [transactions, settings.budgetPeriodEndDay, settings.budgetRates, settings.carryoverSafeToSpend, loans, ready]);
}
