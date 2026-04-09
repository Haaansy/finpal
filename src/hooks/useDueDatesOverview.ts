import { useMemo } from 'react';

import { useBudget } from '@/context/BudgetContext';
import { isExpenseSettled, isLoanRepaymentChecklistPending } from '@/utils/calculations';
import { formatPhp } from '@/utils/currency';
import { calendarMonthKey, formatIsoDateEnPh } from '@/utils/dates';

/** Same copy as the home “Due dates” overview block (current checklist state). */
export function useDueDatesOverview() {
  const { transactions, loans } = useBudget();

  return useMemo(() => {
    const pendingBills = transactions
      .filter((t) => t.type === 'expense' && !isExpenseSettled(t))
      .sort((a, b) => (a.due_date || a.date).localeCompare(b.due_date || b.date));

    const pendingTotal = pendingBills.reduce((s, t) => s + t.amount, 0);

    const ym = calendarMonthKey();
    const pendingLoans = loans.filter((l) => isLoanRepaymentChecklistPending(l, ym));
    const pendingLoanMonthly = pendingLoans.reduce((s, l) => s + l.monthly_repayment, 0);

    const parts: string[] = [];
    if (pendingBills.length > 0) {
      parts.push(
        `${pendingBills.length} bill${pendingBills.length !== 1 ? 's' : ''} · ${formatPhp(pendingTotal)} · next ${formatIsoDateEnPh(pendingBills[0].due_date || pendingBills[0].date)}`
      );
    }
    if (pendingLoans.length > 0) {
      const nextLoan = pendingLoans.find((l) => l.repayment_date);
      const dateHint = nextLoan?.repayment_date
        ? ` · next loan date ${formatIsoDateEnPh(nextLoan.repayment_date)}`
        : '';
      parts.push(
        `${pendingLoans.length} loan repayment${pendingLoans.length !== 1 ? 's' : ''} · ${formatPhp(pendingLoanMonthly)}/mo${dateHint}`
      );
    }
    if (parts.length === 0) {
      return 'No bills or loan installments due on your checklist right now.';
    }
    return parts.join('\n');
  }, [transactions, loans]);
}
