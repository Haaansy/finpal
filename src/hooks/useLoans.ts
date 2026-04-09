import { useMemo } from 'react';

import { useBudget } from '@/context/BudgetContext';
import { loanEstimatedPaidRatio } from '@/utils/calculations';

export function useLoans() {
  const { loans, ready } = useBudget();

  return useMemo(
    () => ({
      ready,
      loans,
      activeLoans: loans.filter((l) => l.months_left > 0),
      paidRatio: (id: number) => {
        const l = loans.find((x) => x.id === id);
        return l ? loanEstimatedPaidRatio(l) : 0;
      },
    }),
    [loans, ready]
  );
}
