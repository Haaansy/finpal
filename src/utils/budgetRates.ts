export interface BudgetRates {
  disposableOfFunds: number;
  futureOfSavings: number;
  emergencyOfSavings: number;
  travelOfSavings: number;
}

export interface BudgetAllocationInputs {
  disposablePct: number;
  futurePct: number;
  emergencyPct: number;
  travelPct: number;
}

export const BUDGET_RATE_SETTING_KEYS = {
  disposable: 'budget_pct_disposable',
  future: 'budget_pct_future',
  emergency: 'budget_pct_emergency',
  travel: 'budget_pct_travel',
} as const;

export const DEFAULT_BUDGET_RATES: BudgetRates = {
  disposableOfFunds: 0.4,
  futureOfSavings: 0.4,
  emergencyOfSavings: 0.4,
  travelOfSavings: 0.2,
};

export const DEFAULT_ALLOCATION_INPUTS: BudgetAllocationInputs = {
  disposablePct: 40,
  futurePct: 40,
  emergencyPct: 40,
  travelPct: 20,
};

function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

/** Integer percents as stored / shown in Settings (before savings normalization). */
export function parseAllocationInputsFromSettings(map: {
  disposable?: string | null;
  future?: string | null;
  emergency?: string | null;
  travel?: string | null;
}): BudgetAllocationInputs {
  return {
    disposablePct: clampInt(Number(map.disposable ?? DEFAULT_ALLOCATION_INPUTS.disposablePct), 5, 95),
    futurePct: clampInt(Number(map.future ?? DEFAULT_ALLOCATION_INPUTS.futurePct), 0, 100),
    emergencyPct: clampInt(Number(map.emergency ?? DEFAULT_ALLOCATION_INPUTS.emergencyPct), 0, 100),
    travelPct: clampInt(Number(map.travel ?? DEFAULT_ALLOCATION_INPUTS.travelPct), 0, 100),
  };
}

/** Normalized rates for math: savings splits sum to 1; disposable is share of remainder. */
export function budgetRatesFromAllocationInputs(raw: BudgetAllocationInputs): BudgetRates {
  const d = clampInt(raw.disposablePct, 5, 95) / 100;
  let f = raw.futurePct;
  let e = raw.emergencyPct;
  let t = raw.travelPct;
  const sum = f + e + t;
  if (sum <= 0) {
    return {
      disposableOfFunds: d,
      futureOfSavings: DEFAULT_BUDGET_RATES.futureOfSavings,
      emergencyOfSavings: DEFAULT_BUDGET_RATES.emergencyOfSavings,
      travelOfSavings: DEFAULT_BUDGET_RATES.travelOfSavings,
    };
  }
  return {
    disposableOfFunds: d,
    futureOfSavings: f / sum,
    emergencyOfSavings: e / sum,
    travelOfSavings: t / sum,
  };
}

export function savingsOfFundsRate(r: BudgetRates): number {
  return Math.max(0, Math.min(1, 1 - r.disposableOfFunds));
}
