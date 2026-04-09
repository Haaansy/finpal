import { useMemo } from 'react';

import { useBudget } from '@/context/BudgetContext';
import type { LoanRow, TransactionRow } from '@/db/types';
import {
  getBudgetPeriodRange,
  isDateInRange,
  isExpenseSettled,
  isLoanRepaymentChecklistPending,
  loanHasRepaymentIntersectingRange,
} from '@/utils/calculations';
import { formatPhp } from '@/utils/currency';
import { calendarMonthKey, formatIsoDateEnPh, parseIsoToDate } from '@/utils/dates';

export type DueDatesOverviewOptions = {
  /** When false, loan lines describe scheduled repayments in range instead of checklist pending state. */
  isCurrentPeriod: boolean;
};

/**
 * Summary text for bills and loans due in a budget period (home / period overview).
 */
export function formatDueDatesOverview(
  transactions: TransactionRow[],
  loans: LoanRow[],
  range: { start: string; end: string },
  loanCheckYm: string,
  opts: DueDatesOverviewOptions,
): string {
  const pendingBills = transactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        !isExpenseSettled(t) &&
        Boolean(t.due_date?.trim()) &&
        isDateInRange(t.due_date!.trim(), range),
    )
    .sort((a, b) => (a.due_date || a.date).localeCompare(b.due_date || b.date));

  const pendingTotal = pendingBills.reduce((s, t) => s + t.amount, 0);

  const parts: string[] = [];
  if (pendingBills.length > 0) {
    parts.push(
      `${pendingBills.length} bill${pendingBills.length !== 1 ? 's' : ''} · ${formatPhp(pendingTotal)} · next ${formatIsoDateEnPh(pendingBills[0].due_date || pendingBills[0].date)}`,
    );
  }

  const loansInRange = loans.filter((l) => loanHasRepaymentIntersectingRange(l, range));
  if (opts.isCurrentPeriod) {
    const pendingLoans = loansInRange.filter((l) => isLoanRepaymentChecklistPending(l, loanCheckYm));
    const pendingLoanMonthly = pendingLoans.reduce((s, l) => s + l.monthly_repayment, 0);
    if (pendingLoans.length > 0) {
      const nextLoan = pendingLoans.find((l) => l.repayment_date);
      const dateHint = nextLoan?.repayment_date
        ? ` · next loan date ${formatIsoDateEnPh(nextLoan.repayment_date)}`
        : '';
      parts.push(
        `${pendingLoans.length} loan repayment${pendingLoans.length !== 1 ? 's' : ''} · ${formatPhp(pendingLoanMonthly)}/mo${dateHint}`,
      );
    }
  } else if (loansInRange.length > 0) {
    const totalMo = loansInRange.reduce((s, l) => s + l.monthly_repayment, 0);
    const nextLoan = loansInRange.find((l) => l.repayment_date);
    const dateHint = nextLoan?.repayment_date
      ? ` · next ${formatIsoDateEnPh(nextLoan.repayment_date)}`
      : '';
    parts.push(
      `${loansInRange.length} loan repayment${loansInRange.length !== 1 ? 's' : ''} scheduled in this period · ${formatPhp(totalMo)}/mo${dateHint}`,
    );
  }

  if (parts.length === 0) {
    return 'No bills or loan installments due on your checklist right now.';
  }
  return parts.join('\n');
}

/** Same copy as the home “Due dates” overview block (current checklist state, current budget period). */
export function useDueDatesOverview() {
  const { transactions, loans, settings } = useBudget();

  return useMemo(() => {
    const range = getBudgetPeriodRange(settings.budgetPeriodEndDay, new Date());
    const ym = calendarMonthKey();
    return formatDueDatesOverview(transactions, loans, range, ym, { isCurrentPeriod: true });
  }, [transactions, loans, settings.budgetPeriodEndDay]);
}

/** Loan checklist month aligned with a budget period end (fallback: anchor month). */
export function loanChecklistYmForBudgetPeriod(range: { start: string; end: string }): string {
  const end = parseIsoToDate(range.end);
  if (end) return calendarMonthKey(end);
  return calendarMonthKey();
}
