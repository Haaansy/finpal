import React, { useEffect } from 'react';

import type { BudgetState } from '@/store/budgetStore';
import { useBudgetStore } from '@/store/budgetStore';

/**
 * Kept for compatibility with the existing app structure.
 * Zustand owns the state; this provider just boots the initial load once.
 */
export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const refresh = useBudgetStore((s) => s.refresh);
  const ready = useBudgetStore((s) => s.ready);

  useEffect(() => {
    if (!ready) {
      refresh().catch(() => undefined);
    }
  }, [ready, refresh]);

  return <>{children}</>;
}

export function useBudget(): BudgetState {
  return useBudgetStore();
}
