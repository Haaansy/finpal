import type { LoanRow } from '@/db/types';
import { addCalendarMonthsToIsoDate } from '@/utils/dates';

/** All scheduled repayment calendar dates from the next payment through remaining installments. */
export function projectedLoanRepaymentIsos(loan: LoanRow): string[] {
  if (loan.months_left <= 0) return [];
  const rd = loan.repayment_date?.trim();
  if (!rd || !/^\d{4}-\d{2}-\d{2}$/.test(rd)) return [];
  if ((loan.is_recurring ?? 1) === 0) {
    return [rd];
  }
  const out: string[] = [];
  for (let i = 0; i < loan.months_left; i++) {
    const iso = addCalendarMonthsToIsoDate(rd, i);
    if (iso) out.push(iso);
  }
  return out;
}

export function loanHasRepaymentOnCalendarDay(loan: LoanRow, isoDay: string): boolean {
  return projectedLoanRepaymentIsos(loan).some((d) => d === isoDay);
}

export function loanHasRepaymentInYearMonth(loan: LoanRow, ymPrefix: string): boolean {
  return projectedLoanRepaymentIsos(loan).some((d) => d.startsWith(ymPrefix));
}
