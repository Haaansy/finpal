import type { LoanRow, SafeToSpendMoveRow, SavingsBalances, TransactionRow } from '@/db/types';
import type { BudgetRates } from '@/utils/budgetRates';
import { DEFAULT_BUDGET_RATES, savingsOfFundsRate } from '@/utils/budgetRates';
import { yearMonthFromIsoDate } from '@/utils/dates';
import { projectedLoanRepaymentIsos } from '@/utils/loanSchedule';

export interface MonthRange {
  start: string;
  end: string;
}

function resolveRates(rates?: BudgetRates): BudgetRates {
  return rates ?? DEFAULT_BUDGET_RATES;
}

/** Default low-priority / disposable slice of Remaining Funds (40%). */
export const RATE_DISPOSABLE_OF_FUNDS = DEFAULT_BUDGET_RATES.disposableOfFunds;

/** Default savings slice of Remaining Funds (complement of disposable). */
export const RATE_SAVINGS_OF_FUNDS = savingsOfFundsRate(DEFAULT_BUDGET_RATES);

/** Default split of the savings slice (sums to 1). */
export const RATE_FUTURE_OF_SAVINGS = DEFAULT_BUDGET_RATES.futureOfSavings;
export const RATE_EMERGENCY_OF_SAVINGS = DEFAULT_BUDGET_RATES.emergencyOfSavings;
export const RATE_TRAVEL_OF_SAVINGS = DEFAULT_BUDGET_RATES.travelOfSavings;

/**
 * Remaining Funds (per budget period) = sum(income) − sum(high-priority expenses + active loan repayments)
 * in that period. High-priority includes bills marked “awaiting payment” (by due date in the period). Loan
 * repayments count the same as high-priority spending toward that total. The remainder is split between a disposable
 * slice and savings; savings is further split into future, emergency, and travel. Percentages are configurable in
 * Settings. Running balances sum those splits across past periods (recomputed from history + loans).
 */

/** Illustrative split for one peso of remainder (e.g. after-save message); balances use period totals. */
export function incomeAllocationFromAmount(
  amount: number,
  ratesInput?: BudgetRates
): {
  disposable: number;
  future: number;
  emergency: number;
  travel: number;
} {
  const r = resolveRates(ratesInput);
  const sav = savingsOfFundsRate(r);
  const disposable = amount * r.disposableOfFunds;
  const savingsGross = amount * sav;
  return {
    disposable,
    future: savingsGross * r.futureOfSavings,
    emergency: savingsGross * r.emergencyOfSavings,
    travel: savingsGross * r.travelOfSavings,
  };
}

/** Remaining Funds for the period (before 40% / 60% split). */
export function computeFunds(periodIncome: number, periodHighPriExpenses: number): number {
  return Math.max(0, periodIncome - periodHighPriExpenses);
}

export function savingsPoolFromFunds(funds: number, ratesInput?: BudgetRates): number {
  const r = resolveRates(ratesInput);
  return funds * savingsOfFundsRate(r);
}

/** Disposable budget for the period (share of Funds). */
export function disposableBudgetFromFunds(funds: number, ratesInput?: BudgetRates): number {
  const r = resolveRates(ratesInput);
  return funds * r.disposableOfFunds;
}

/** Targets from period Funds (for UI), not running balances. */
export function periodBucketTargetsFromFunds(funds: number, ratesInput?: BudgetRates): {
  savingsPool: number;
  disposable: number;
  future: number;
  emergency: number;
  travel: number;
} {
  const r = resolveRates(ratesInput);
  const disposable = funds * r.disposableOfFunds;
  const savingsPool = savingsPoolFromFunds(funds, r);
  return {
    savingsPool,
    disposable,
    future: savingsPool * r.futureOfSavings,
    emergency: savingsPool * r.emergencyOfSavings,
    travel: savingsPool * r.travelOfSavings,
  };
}

function daysInMonth(y: number, monthIndex: number): number {
  return new Date(y, monthIndex + 1, 0).getDate();
}

function clampDayOfMonth(y: number, monthIndex: number, day: number): number {
  const dim = daysInMonth(y, monthIndex);
  return Math.min(Math.max(1, day), dim);
}

function isoFromParts(y: number, monthIndex: number, day: number): string {
  const d = clampDayOfMonth(y, monthIndex, day);
  return `${y}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function getCalendarMonthRange(ref: Date = new Date()): MonthRange {
  const y = ref.getFullYear();
  const m0 = ref.getMonth();
  const last = daysInMonth(y, m0);
  return {
    start: isoFromParts(y, m0, 1),
    end: isoFromParts(y, m0, last),
  };
}

/** @deprecated Use getCalendarMonthRange or getBudgetPeriodRange */
export function getCurrentMonthRange(): MonthRange {
  return getCalendarMonthRange();
}

export function getBudgetPeriodRange(budgetPeriodEndDay: number, ref: Date = new Date()): MonthRange {
  if (budgetPeriodEndDay === 0) {
    return getCalendarMonthRange(ref);
  }

  const endDay = Math.min(Math.max(1, budgetPeriodEndDay), 31);
  const y = ref.getFullYear();
  const m0 = ref.getMonth();
  const d = ref.getDate();

  const endThisMonth = clampDayOfMonth(y, m0, endDay);
  let endY: number;
  let endM0: number;
  let endD: number;

  if (d <= endThisMonth) {
    endY = y;
    endM0 = m0;
    endD = endThisMonth;
  } else {
    const nextM0 = m0 === 11 ? 0 : m0 + 1;
    const nextY = m0 === 11 ? y + 1 : y;
    endD = clampDayOfMonth(nextY, nextM0, endDay);
    endY = nextY;
    endM0 = nextM0;
  }

  let pm = endM0 === 0 ? 11 : endM0 - 1;
  let py = endM0 === 0 ? endY - 1 : endY;
  const prevEndD = clampDayOfMonth(py, pm, endDay);
  const prevEnd = new Date(py, pm, prevEndD);
  prevEnd.setDate(prevEnd.getDate() + 1);

  const start = isoFromParts(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate());
  const end = isoFromParts(endY, endM0, endD);
  return { start, end };
}

/** Budget period immediately before the one that contains `ref` (same rules as `getBudgetPeriodRange`). */
export function getPreviousBudgetPeriodRange(budgetPeriodEndDay: number, ref: Date = new Date()): MonthRange {
  const current = getBudgetPeriodRange(budgetPeriodEndDay, ref);
  const d = parseIsoToLocalDate(current.start);
  d.setDate(d.getDate() - 1);
  return getBudgetPeriodRange(budgetPeriodEndDay, d);
}

function parseIsoToLocalDate(iso: string): Date {
  const parts = iso.split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return new Date();
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Stable id for the budget period that contains this calendar day. */
function periodRangeKey(isoDate: string, budgetPeriodEndDay: number): string {
  const range = getBudgetPeriodRange(budgetPeriodEndDay, parseIsoToLocalDate(isoDate));
  return `${range.start}|${range.end}`;
}

/**
 * Sum over every budget period: for each period, remainder = income − (high-priority tx + loan repayments),
 * then disposable / savings split. Loan slice uses **all** loans’ `monthly_repayment` (same basis as periodHighPriorityOutflow / safe-to-spend).
 */
export function computeBalancesFromTransactions(
  transactions: TransactionRow[],
  budgetPeriodEndDay: number,
  loans: LoanRow[],
  ratesInput?: BudgetRates,
  opts?: { sweepUnspentSafeToSpendToFuture?: boolean }
): SavingsBalances {
  const r = resolveRates(ratesInput);
  const savRate = savingsOfFundsRate(r);
  const loanPay = totalMonthlyLoanRepaymentsAll(loans);
  const groups = new Map<string, TransactionRow[]>();
  for (const t of transactions) {
    const key = periodRangeKey(transactionPeriodAnchor(t), budgetPeriodEndDay);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  let disposable = 0;
  let emergency = 0;
  let travel = 0;
  let standard = 0;

  for (const [, txs] of groups) {
    const income = txs.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0);
    const highPriTx = txs
      .filter((x) => x.type === 'expense' && x.priority === 'high')
      .reduce((s, x) => s + x.amount, 0);
    const highPri = highPriTx + loanPay;
    const remainder = computeFunds(income, highPri);
    const disposableBudget = remainder * r.disposableOfFunds;
    if (!opts?.sweepUnspentSafeToSpendToFuture) {
      disposable += disposableBudget;
    }
    const sg = remainder * savRate;
    emergency += sg * r.emergencyOfSavings;
    travel += sg * r.travelOfSavings;
    standard += sg * r.futureOfSavings;

    if (opts?.sweepUnspentSafeToSpendToFuture) {
      const lowPriSpent = txs
        .filter((x) => x.type === 'expense' && x.priority === 'low' && isExpenseSettled(x))
        .reduce((s, x) => s + x.amount, 0);
      const leftover = Math.max(0, disposableBudget - lowPriSpent);
      standard += leftover;
    }
  }

  return { emergency, travel, standard, disposable };
}

export function ordinalDay(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function describeBudgetPeriodRule(budgetPeriodEndDay: number): string {
  if (budgetPeriodEndDay === 0) {
    return 'Period ends on the last day of each calendar month.';
  }
  return `Period ends on the ${ordinalDay(budgetPeriodEndDay)} of each month (last day of month if shorter).`;
}

export function isDateInRange(isoDate: string, range: MonthRange): boolean {
  return isoDate >= range.start && isoDate <= range.end;
}

/**
 * Calendar date that assigns an expense to a budget period. If `due_date` is set (checklist / awaiting bills), use
 * it so marking paid (which updates `date` to payment day) does not move the amount out of the due period.
 */
export function expensePeriodDate(t: TransactionRow): string {
  if (t.type !== 'expense') return t.date;
  const due = t.due_date?.trim();
  if (due && /^\d{4}-\d{2}-\d{2}$/.test(due)) return due;
  return t.date;
}

function transactionPeriodAnchor(t: TransactionRow): string {
  return t.type === 'expense' ? expensePeriodDate(t) : t.date;
}

/** False when expense is awaiting payment (checklist); high-priority awaiting rows still count in Remaining Funds. */
export function isExpenseSettled(t: TransactionRow): boolean {
  if (t.type !== 'expense') return true;
  return (t.is_paid ?? 1) !== 0;
}

export function filterTransactionsForMonth(rows: TransactionRow[], range: MonthRange): TransactionRow[] {
  return rows.filter(
    (t) => isDateInRange(transactionPeriodAnchor(t), range) && isExpenseSettled(t)
  );
}

export function filterSafeToSpendMovesForMonth(moves: SafeToSpendMoveRow[], range: MonthRange): SafeToSpendMoveRow[] {
  return moves.filter((m) => isDateInRange(m.date, range));
}

export function sumSafeToSpendMovesForMonth(moves: SafeToSpendMoveRow[], range: MonthRange): number {
  return filterSafeToSpendMovesForMonth(moves, range).reduce((s, x) => s + x.amount, 0);
}

export function sumIncomeForMonth(rows: TransactionRow[], range: MonthRange): number {
  return filterTransactionsForMonth(rows, range)
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
}

/** All high-priority expenses in range (paid and awaiting payment) — basis for Remaining Funds outflow. */
export function sumHighPriorityExpensesForMonth(rows: TransactionRow[], range: MonthRange): number {
  return rows
    .filter(
      (t) =>
        isDateInRange(expensePeriodDate(t), range) && t.type === 'expense' && t.priority === 'high'
    )
    .reduce((s, t) => s + t.amount, 0);
}

/** High-priority expenses in range that are already marked paid (subset of sumHighPriorityExpensesForMonth). */
export function sumPaidHighPriorityExpensesForMonth(rows: TransactionRow[], range: MonthRange): number {
  return rows
    .filter(
      (t) =>
        isDateInRange(expensePeriodDate(t), range) &&
        t.type === 'expense' &&
        t.priority === 'high' &&
        isExpenseSettled(t)
    )
    .reduce((s, t) => s + t.amount, 0);
}

/** High-priority bills awaiting payment in range (subset of sumHighPriorityExpensesForMonth). */
export function sumUnpaidHighPriorityExpensesForMonth(rows: TransactionRow[], range: MonthRange): number {
  return rows
    .filter(
      (t) =>
        isDateInRange(expensePeriodDate(t), range) &&
        t.type === 'expense' &&
        t.priority === 'high' &&
        !isExpenseSettled(t)
    )
    .reduce((s, t) => s + t.amount, 0);
}

export function sumLowPriorityExpensesForMonth(rows: TransactionRow[], range: MonthRange): number {
  return rows
    .filter(
      (t) =>
        isDateInRange(expensePeriodDate(t), range) &&
        t.type === 'expense' &&
        t.priority === 'low' &&
        isExpenseSettled(t)
    )
    .reduce((s, t) => s + t.amount, 0);
}

/** Active loans only (`months_left > 0`) — for UI that should reflect ongoing obligations only. */
export function totalMonthlyLoanRepayments(loans: LoanRow[]): number {
  return loans.filter((l) => l.months_left > 0).reduce((s, l) => s + l.monthly_repayment, 0);
}

/** Sum of `monthly_repayment` for every loan (aligned with Remaining Funds, safe-to-spend, savings recompute). */
export function totalMonthlyLoanRepaymentsAll(loans: LoanRow[]): number {
  return loans.reduce((s, l) => s + Math.max(0, l.monthly_repayment || 0), 0);
}

/**
 * Sum of loan repayments that fall inside the given range, based on each loan’s scheduled repayment dates.
 * This is used for period-specific views (Home / Past Overview / future overview), so a loan due next month
 * won’t reduce this month’s period.
 */
export function sumLoanRepaymentsDueForRange(loans: LoanRow[], range: MonthRange): number {
  let total = 0;
  for (const loan of loans) {
    const amount = Math.max(0, loan.monthly_repayment || 0);
    if (amount <= 0) continue;

    // One-off loans: treat `repayment_date` as the single due date even if months_left was set to 0 after ticking.
    // This keeps period outflow stable (paid vs unpaid shouldn't change totals for the period where it was due).
    if ((loan.is_recurring ?? 1) === 0) {
      const due = (loan.repayment_date ?? '').trim();
      if (due && /^\d{4}-\d{2}-\d{2}$/.test(due) && isDateInRange(due, range)) {
        total += amount;
      }
      continue;
    }

    if (loan.months_left <= 0) continue;
    const dueIsos = projectedLoanRepaymentIsos(loan);
    if (dueIsos.length === 0) continue;
    const countInRange = dueIsos.reduce((c, iso) => (isDateInRange(iso, range) ? c + 1 : c), 0);
    if (countInRange > 0) total += amount * countInRange;
  }
  return total;
}

/**
 * High-priority outflow for the period = high-priority expenses in range (paid + awaiting) **plus** **all** loans’
 * monthly repayments. Same basis as Remaining Funds, safe-to-spend, and savings bucket recompute.
 */
export function periodHighPriorityOutflow(
  rows: TransactionRow[],
  loans: LoanRow[],
  range: MonthRange
): number {
  return sumHighPriorityExpensesForMonth(rows, range) + totalMonthlyLoanRepaymentsAll(loans);
}

/**
 * Safe-to-spend = disposable slice of Remaining Funds − low-priority spending. Loans are already inside Remaining Funds via
 * periodHighPriorityOutflow.
 */
export function computeSafeToSpend(
  transactions: TransactionRow[],
  loans: LoanRow[],
  range: MonthRange,
  ratesInput?: BudgetRates
): number {
  const r = resolveRates(ratesInput);
  const income = sumIncomeForMonth(transactions, range);
  const highPriTotal = periodHighPriorityOutflow(transactions, loans, range);
  const funds = computeFunds(income, highPriTotal);
  const disposableBudget = disposableBudgetFromFunds(funds, r);
  const lowPri = sumLowPriorityExpensesForMonth(transactions, range);
  return disposableBudget - lowPri;
}

/** Safe-to-spend across all past periods, carrying forward any unspent remainder. */
export function computeSafeToSpendCarryover(
  transactions: TransactionRow[],
  loans: LoanRow[],
  budgetPeriodEndDay: number,
  ratesInput?: BudgetRates,
  /** Only include periods whose end date is <= this ISO date. When omitted, includes all periods. */
  upToPeriodEndIso?: string
): number {
  const r = resolveRates(ratesInput);
  const loanPay = totalMonthlyLoanRepaymentsAll(loans);
  const groups = new Map<string, TransactionRow[]>();
  for (const t of transactions) {
    const key = periodRangeKey(transactionPeriodAnchor(t), budgetPeriodEndDay);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  let keys = [...groups.keys()].sort((a, b) => a.localeCompare(b)); // oldest → newest
  if (upToPeriodEndIso && /^\d{4}-\d{2}-\d{2}$/.test(upToPeriodEndIso)) {
    keys = keys.filter((k) => {
      const end = k.split('|')[1] ?? '';
      return end !== '' && end <= upToPeriodEndIso;
    });
  }
  let balance = 0;
  for (const k of keys) {
    const txs = groups.get(k)!;
    const income = txs.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0);
    const highPriTx = txs
      .filter((x) => x.type === 'expense' && x.priority === 'high')
      .reduce((s, x) => s + x.amount, 0);
    const highPri = highPriTx + loanPay;
    const funds = computeFunds(income, highPri);
    const disposableBudget = disposableBudgetFromFunds(funds, r);

    const [start, end] = k.split('|');
    const range: MonthRange = { start, end };
    const lowPri = sumLowPriorityExpensesForMonth(transactions, range);

    balance += disposableBudget - lowPri;
  }
  return balance;
}

export function loanEstimatedPaidRatio(loan: LoanRow): number {
  if (loan.total_amount <= 0) return 0;
  const estimatedRemaining = loan.months_left * loan.monthly_repayment;
  const paid = Math.max(0, loan.total_amount - estimatedRemaining);
  return Math.min(1, paid / loan.total_amount);
}

/**
 * Recurring: pending if not ticked for this calendar month (month rollover clears the tick).
 * Non-recurring (one-off): pending from the repayment date’s month onward until marked paid (months_left → 0).
 */
export function isLoanRepaymentChecklistPending(loan: LoanRow, calendarMonthYm: string): boolean {
  if (loan.months_left <= 0) return false;
  const recurring = (loan.is_recurring ?? 1) !== 0;
  if (recurring) {
    return (loan.repayment_acknowledged_ym ?? null) !== calendarMonthYm;
  }
  const dueYm = yearMonthFromIsoDate(loan.repayment_date);
  if (!dueYm) return false;
  return dueYm <= calendarMonthYm;
}

export type ChecklistDueFilter = 'all' | 'unpaid' | 'paid';

/** Expense was saved with a due date (awaiting-payment / checklist bill). */
export function isChecklistScheduledBill(t: TransactionRow): boolean {
  return t.type === 'expense' && Boolean(t.due_date?.trim());
}

/**
 * Loan row counts as checklist “paid” for the month: recurring ticked this month, or one-off completed (no months left).
 */
export function isLoanChecklistPaidForMonth(loan: LoanRow, calendarMonthYm: string): boolean {
  const recurring = (loan.is_recurring ?? 1) !== 0;
  if (!recurring) {
    return loan.months_left <= 0;
  }
  return loan.months_left > 0 && (loan.repayment_acknowledged_ym ?? null) === calendarMonthYm;
}

export function isLoanOnChecklistFilter(
  loan: LoanRow,
  calendarMonthYm: string,
  filter: ChecklistDueFilter
): boolean {
  const pending = isLoanRepaymentChecklistPending(loan, calendarMonthYm);
  const paidRow = isLoanChecklistPaidForMonth(loan, calendarMonthYm);
  if (filter === 'unpaid') return pending;
  if (filter === 'paid') return paidRow;
  return pending || paidRow;
}

export function filterChecklistBills(transactions: TransactionRow[], filter: ChecklistDueFilter): TransactionRow[] {
  let rows = transactions.filter(isChecklistScheduledBill);
  if (filter === 'unpaid') rows = rows.filter((t) => !isExpenseSettled(t));
  else if (filter === 'paid') rows = rows.filter((t) => isExpenseSettled(t));
  return rows.sort((a, b) => (a.due_date || a.date).localeCompare(b.due_date || b.date));
}
