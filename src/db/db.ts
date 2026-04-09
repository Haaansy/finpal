import * as SQLite from 'expo-sqlite';

import type {
  AppSettings,
  BudgetAllocationInputs,
  ExpensePriority,
  LoanRow,
  SafeToSpendMoveRow,
  SavingsBalances,
  ThemePreference,
  TransactionRow,
  TransactionType,
} from '@/db/types';
import {
  BUDGET_RATE_SETTING_KEYS,
  budgetRatesFromAllocationInputs,
  parseAllocationInputsFromSettings,
} from '@/utils/budgetRates';
import {
  computeBalancesFromTransactions,
  computeFunds,
  getBudgetPeriodRange,
  periodBucketTargetsFromFunds,
  sumHighPriorityExpensesForMonth,
  sumIncomeForMonth,
} from '@/utils/calculations';
import { addCalendarMonthsToIsoDate } from '@/utils/dates';

const DB_NAME = 'finpal.db';
const SETTING_CARRYOVER_SAFE_TO_SPEND = 'carryover_safe_to_spend';
const SETTING_LOAN_NOTIFY_ENABLED = 'loan_notify_enabled';
const SETTING_LOAN_NOTIFY_DAYS_BEFORE = 'loan_notify_days_before';
const SETTING_LOAN_NOTIFY_TIME = 'loan_notify_time';
const SETTING_ONBOARDING_DONE = 'onboarding_done';
const SETTING_NOTIFICATIONS_ENABLED = 'notifications_enabled';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * expo-sqlite on Android can throw "NativeDatabase.prepareAsync has been rejected" when multiple async statements
 * run on the same connection at once. Run all exported DB entry points through this queue.
 */
let dbOpChain: Promise<unknown> = Promise.resolve();

function runSerialized<T>(work: () => Promise<T>): Promise<T> {
  const next = dbOpChain.then(work);
  dbOpChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS savings_balances (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      emergency REAL NOT NULL DEFAULT 0,
      travel REAL NOT NULL DEFAULT 0,
      standard REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      priority TEXT CHECK (priority IN ('high', 'low') OR priority IS NULL),
      category TEXT,
      date TEXT NOT NULL,
      emergency_alloc REAL,
      travel_alloc REAL,
      standard_alloc REAL
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      monthly_repayment REAL NOT NULL,
      months_left INTEGER NOT NULL CHECK (months_left >= 0)
    );

    CREATE TABLE IF NOT EXISTS savings_bubbles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL DEFAULT 0,
      current_amount REAL NOT NULL DEFAULT 0,
      target_date TEXT,
      remind_enabled INTEGER NOT NULL DEFAULT 1,
      remind_time TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      linked_bubble_id INTEGER,
      linked_bucket TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS safe_to_spend_moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      bubble_id INTEGER,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const rows = await db.getAllAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM savings_balances WHERE id = 1`
  );
  if (!rows[0]?.c) {
    await db.runAsync(
      `INSERT OR IGNORE INTO savings_balances (id, emergency, travel, standard) VALUES (1, 0, 0, 0)`
    );
  }

  const defaults: [string, string][] = [
    ['emergency_pct', '10'],
    ['travel_pct', '10'],
    ['standard_pct', '10'],
    ['theme_preference', 'system'],
    [SETTING_ONBOARDING_DONE, '0'],
    [SETTING_NOTIFICATIONS_ENABLED, '1'],
    ['budget_period_end_day', '0'],
    ['loan_tick_ym', monthKey(new Date())],
    [SETTING_CARRYOVER_SAFE_TO_SPEND, '0'],
    [SETTING_LOAN_NOTIFY_ENABLED, '1'],
    [SETTING_LOAN_NOTIFY_DAYS_BEFORE, '3'],
    [SETTING_LOAN_NOTIFY_TIME, '09:00'],
    [BUDGET_RATE_SETTING_KEYS.disposable, '40'],
    [BUDGET_RATE_SETTING_KEYS.future, '40'],
    [BUDGET_RATE_SETTING_KEYS.emergency, '40'],
    [BUDGET_RATE_SETTING_KEYS.travel, '20'],
  ];
  for (const [k, v] of defaults) {
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      k,
      v
    );
  }

  await ensureSchemaPatches(db);
}

async function ensureSchemaPatches(db: SQLite.SQLiteDatabase): Promise<void> {
  const balCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(savings_balances)`);
  if (!balCols.some((c) => c.name === 'disposable')) {
    await db.execAsync(`ALTER TABLE savings_balances ADD COLUMN disposable REAL NOT NULL DEFAULT 0`);
  }
  const txCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(transactions)`);
  if (!txCols.some((c) => c.name === 'disposable_alloc')) {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN disposable_alloc REAL`);
  }
  if (!txCols.some((c) => c.name === 'due_date')) {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN due_date TEXT`);
  }
  if (!txCols.some((c) => c.name === 'is_paid')) {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 1`);
  }
  const loanCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(loans)`);
  if (!loanCols.some((c) => c.name === 'repayment_date')) {
    await db.execAsync(`ALTER TABLE loans ADD COLUMN repayment_date TEXT`);
  }
  if (!loanCols.some((c) => c.name === 'is_recurring')) {
    await db.execAsync(`ALTER TABLE loans ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 1`);
  }
  if (!loanCols.some((c) => c.name === 'repayment_acknowledged_ym')) {
    await db.execAsync(`ALTER TABLE loans ADD COLUMN repayment_acknowledged_ym TEXT`);
    const ym = monthKey(new Date());
    await db.runAsync(`UPDATE loans SET repayment_acknowledged_ym = ? WHERE months_left > 0`, ym);
  }

  // Ensure tables exist (older installs).
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS savings_bubbles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL DEFAULT 0,
      current_amount REAL NOT NULL DEFAULT 0,
      target_date TEXT,
      remind_enabled INTEGER NOT NULL DEFAULT 1,
      remind_time TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      linked_bubble_id INTEGER,
      linked_bucket TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS safe_to_spend_moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      bubble_id INTEGER,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const accountCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(accounts)`);
  if (!accountCols.some((c) => c.name === 'linked_bucket')) {
    await db.execAsync(`ALTER TABLE accounts ADD COLUMN linked_bucket TEXT`);
  }

  const bubbleCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(savings_bubbles)`);
  if (!bubbleCols.some((c) => c.name === 'target_date')) {
    await db.execAsync(`ALTER TABLE savings_bubbles ADD COLUMN target_date TEXT`);
  }
  if (!bubbleCols.some((c) => c.name === 'remind_enabled')) {
    await db.execAsync(`ALTER TABLE savings_bubbles ADD COLUMN remind_enabled INTEGER NOT NULL DEFAULT 1`);
  }
  if (!bubbleCols.some((c) => c.name === 'remind_time')) {
    await db.execAsync(`ALTER TABLE savings_bubbles ADD COLUMN remind_time TEXT`);
  }
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
}

function compareYm(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function nextYm(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Opens SQLite, runs migrations once, and returns a shared database instance.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (!initPromise) {
    initPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      await ensureLoanMonthTick(db);
      await ensureSavingsDepositDueRows(db);
      await recomputeSavingsBalancesWithDb(db);
      dbInstance = db;
      return db;
    })();
  }
  return initPromise;
}

async function ensureSavingsDepositDueRows(db: SQLite.SQLiteDatabase): Promise<void> {
  const pe = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'budget_period_end_day'`
  );
  const budgetPeriodEndDay = clampBudgetPeriodEndDay(Number(pe?.value ?? 0));
  const rates = await loadBudgetRatesFromDb(db);

  const now = new Date();
  const range = getBudgetPeriodRange(budgetPeriodEndDay, now);
  const dueDate = range.end;

  const txs = await db.getAllAsync<TransactionRow>(
    `SELECT id, amount, description, type, priority, category, date, due_date, is_paid, emergency_alloc, travel_alloc, standard_alloc, disposable_alloc
     FROM transactions`
  );

  const income = sumIncomeForMonth(txs, range);
  const highPriBills = sumHighPriorityExpensesForMonth(txs, range);
  const funds = computeFunds(income, highPriBills);
  const targets = periodBucketTargetsFromFunds(funds, rates);

  const rows: { desc: string; amt: number }[] = [
    { desc: 'Deposit to Future savings', amt: targets.future },
    { desc: 'Deposit to Emergency fund', amt: targets.emergency },
    { desc: 'Deposit to Travel fund', amt: targets.travel },
  ].map((r) => ({ ...r, amt: Math.round(Math.max(0, r.amt) * 100) / 100 }));

  for (const r of rows) {
    if (!(r.amt > 0)) continue;
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM transactions
       WHERE type = 'expense'
         AND priority = 'low'
         AND category = 'Savings deposit'
         AND due_date = ?
         AND is_paid = 0
         AND COALESCE(description,'') = ?
       LIMIT 1`,
      dueDate,
      r.desc
    );
    if (existing?.id) continue;
    await db.runAsync(
      `INSERT INTO transactions (amount, description, type, priority, category, date, due_date, is_paid, emergency_alloc, travel_alloc, standard_alloc, disposable_alloc)
       VALUES (?, ?, 'expense', 'low', 'Savings deposit', ?, ?, 0, NULL, NULL, NULL, NULL)`,
      r.amt,
      r.desc,
      dueDate,
      dueDate
    );
  }
}

export async function resetDatabaseCache(): Promise<void> {
  dbInstance = null;
  initPromise = null;
}

async function ensureLoanMonthTick(db: SQLite.SQLiteDatabase): Promise<void> {
  const current = monthKey(new Date());
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'loan_tick_ym'`
  );
  let stored = row?.value ?? current;
  if (compareYm(stored, current) > 0) {
    stored = current;
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES ('loan_tick_ym', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      current
    );
    return;
  }

  while (compareYm(stored, current) < 0) {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE loans SET months_left = MAX(0, months_left - 1) WHERE months_left > 0 AND is_recurring != 0`
      );
      await db.runAsync(`UPDATE loans SET repayment_acknowledged_ym = NULL`);
      const rolled = await db.getAllAsync<{ id: number; repayment_date: string }>(
        `SELECT id, repayment_date FROM loans WHERE COALESCE(is_recurring, 1) != 0 AND months_left > 0 AND repayment_date IS NOT NULL`
      );
      for (const r of rolled) {
        const nextIso = addCalendarMonthsToIsoDate(r.repayment_date, 1);
        if (nextIso) {
          await db.runAsync(`UPDATE loans SET repayment_date = ? WHERE id = ?`, nextIso, r.id);
        }
      }
      const next = nextYm(stored);
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES ('loan_tick_ym', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        next
      );
    });
    stored = nextYm(stored);
  }
}

export async function getSetting(key: string): Promise<string | null> {
  return runSerialized(async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = ?`,
      key
    );
    return row?.value ?? null;
  });
}

export async function setSetting(key: string, value: string): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value
    );
  });
}

function clampBudgetPeriodEndDay(raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) return 0;
  if (raw > 31) return 31;
  return Math.floor(raw);
}

export async function getAppSettings(): Promise<AppSettings> {
  return runSerialized(async () => {
    const db = await getDatabase();
    const keys = [
      'theme_preference',
      SETTING_ONBOARDING_DONE,
      SETTING_NOTIFICATIONS_ENABLED,
      'budget_period_end_day',
      SETTING_CARRYOVER_SAFE_TO_SPEND,
      SETTING_LOAN_NOTIFY_ENABLED,
      SETTING_LOAN_NOTIFY_DAYS_BEFORE,
      SETTING_LOAN_NOTIFY_TIME,
      BUDGET_RATE_SETTING_KEYS.disposable,
      BUDGET_RATE_SETTING_KEYS.future,
      BUDGET_RATE_SETTING_KEYS.emergency,
      BUDGET_RATE_SETTING_KEYS.travel,
    ] as const;
    const ph = keys.map(() => '?').join(',');
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key IN (${ph})`,
      ...keys
    );
    const map: Record<string, string | undefined> = {};
    for (const r of rows) map[r.key] = r.value;

    const raw = parseAllocationInputsFromSettings({
      disposable: map[BUDGET_RATE_SETTING_KEYS.disposable],
      future: map[BUDGET_RATE_SETTING_KEYS.future],
      emergency: map[BUDGET_RATE_SETTING_KEYS.emergency],
      travel: map[BUDGET_RATE_SETTING_KEYS.travel],
    });
    return {
      themePreference: (map.theme_preference as ThemePreference) || 'system',
      onboardingDone: Number(map[SETTING_ONBOARDING_DONE] ?? 0) !== 0,
      notificationsEnabled: Number(map[SETTING_NOTIFICATIONS_ENABLED] ?? 1) !== 0,
      budgetPeriodEndDay: clampBudgetPeriodEndDay(Number(map.budget_period_end_day ?? 0)),
      carryoverSafeToSpend: Number(map[SETTING_CARRYOVER_SAFE_TO_SPEND] ?? 0) !== 0,
      loanNotifyEnabled: Number(map[SETTING_LOAN_NOTIFY_ENABLED] ?? 1) !== 0,
      loanNotifyDaysBefore: Math.max(0, Math.floor(Number(map[SETTING_LOAN_NOTIFY_DAYS_BEFORE] ?? 3))),
      loanNotifyTime: String(map[SETTING_LOAN_NOTIFY_TIME] ?? '09:00'),
      budgetRates: budgetRatesFromAllocationInputs(raw),
      budgetAllocationRaw: raw,
    };
  });
}

export async function updateNotificationsEnabled(enabled: boolean): Promise<void> {
  await setSetting(SETTING_NOTIFICATIONS_ENABLED, enabled ? '1' : '0');
}

export async function updateCarryoverSafeToSpend(enabled: boolean): Promise<void> {
  await setSetting(SETTING_CARRYOVER_SAFE_TO_SPEND, enabled ? '1' : '0');
}

export async function updateLoanNotificationSettings(input: {
  enabled: boolean;
  daysBefore: number;
  time: string;
}): Promise<void> {
  await runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      SETTING_LOAN_NOTIFY_ENABLED,
      input.enabled ? '1' : '0'
    );
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      SETTING_LOAN_NOTIFY_DAYS_BEFORE,
      String(Math.max(0, Math.floor(input.daysBefore)))
    );
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      SETTING_LOAN_NOTIFY_TIME,
      String(input.time)
    );
  });
}

export async function updateThemePreference(pref: ThemePreference): Promise<void> {
  await setSetting('theme_preference', pref);
}

export async function updateBudgetPeriodEndDay(day: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES ('budget_period_end_day', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      String(clampBudgetPeriodEndDay(day))
    );
    await recomputeSavingsBalancesWithDb(db);
  });
}

export async function updateBudgetAllocationRates(input: BudgetAllocationInputs): Promise<void> {
  const raw = parseAllocationInputsFromSettings({
    disposable: String(input.disposablePct),
    future: String(input.futurePct),
    emergency: String(input.emergencyPct),
    travel: String(input.travelPct),
  });
  return runSerialized(async () => {
    const db = await getDatabase();
    const upsert = async (key: string, value: string) =>
      db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        key,
        value
      );
    await upsert(BUDGET_RATE_SETTING_KEYS.disposable, String(raw.disposablePct));
    await upsert(BUDGET_RATE_SETTING_KEYS.future, String(raw.futurePct));
    await upsert(BUDGET_RATE_SETTING_KEYS.emergency, String(raw.emergencyPct));
    await upsert(BUDGET_RATE_SETTING_KEYS.travel, String(raw.travelPct));
    await recomputeSavingsBalancesWithDb(db);
  });
}

export async function getSavingsBalances(): Promise<SavingsBalances> {
  return runSerialized(async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      emergency: number;
      travel: number;
      standard: number;
      disposable: number;
    }>(`SELECT emergency, travel, standard, disposable FROM savings_balances WHERE id = 1`);
    return {
      emergency: row?.emergency ?? 0,
      travel: row?.travel ?? 0,
      standard: row?.standard ?? 0,
      disposable: row?.disposable ?? 0,
    };
  });
}

function finiteBalance(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

async function loadBudgetRatesFromDb(db: SQLite.SQLiteDatabase) {
  const keys = [
    BUDGET_RATE_SETTING_KEYS.disposable,
    BUDGET_RATE_SETTING_KEYS.future,
    BUDGET_RATE_SETTING_KEYS.emergency,
    BUDGET_RATE_SETTING_KEYS.travel,
  ];
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM settings WHERE key IN (?,?,?,?)`,
    ...keys
  );
  const map: Record<string, string | undefined> = {};
  for (const r of rows) map[r.key] = r.value;
  const raw = parseAllocationInputsFromSettings({
    disposable: map[BUDGET_RATE_SETTING_KEYS.disposable],
    future: map[BUDGET_RATE_SETTING_KEYS.future],
    emergency: map[BUDGET_RATE_SETTING_KEYS.emergency],
    travel: map[BUDGET_RATE_SETTING_KEYS.travel],
  });
  return budgetRatesFromAllocationInputs(raw);
}

async function recomputeSavingsBalancesWithDb(db: SQLite.SQLiteDatabase): Promise<void> {
  const txs = await db.getAllAsync<TransactionRow>(
    `SELECT id, amount, description, type, priority, category, date, due_date, is_paid, emergency_alloc, travel_alloc, standard_alloc, disposable_alloc
     FROM transactions`
  );
  const pe = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'budget_period_end_day'`
  );
  const budgetPeriodEndDay = clampBudgetPeriodEndDay(Number(pe?.value ?? 0));
  const loanRows = await db.getAllAsync<LoanRow>(
    `SELECT id, name, total_amount, monthly_repayment, months_left, repayment_date, is_recurring, repayment_acknowledged_ym FROM loans`
  );
  const carryRow = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    SETTING_CARRYOVER_SAFE_TO_SPEND
  );
  const sweep = (carryRow?.value ?? '0') !== '0';
  const rates = await loadBudgetRatesFromDb(db);
  const b = computeBalancesFromTransactions(txs, budgetPeriodEndDay, loanRows, rates, {
    sweepUnspentSafeToSpendToFuture: sweep,
  });
  await db.runAsync(
    `UPDATE savings_balances SET emergency = ?, travel = ?, standard = ?, disposable = ? WHERE id = 1`,
    finiteBalance(b.emergency),
    finiteBalance(b.travel),
    finiteBalance(b.standard),
    finiteBalance(b.disposable)
  );

  // Mirror balances for accounts linked to system buckets.
  const bal = await db.getFirstAsync<{ emergency: number; travel: number; standard: number }>(
    `SELECT emergency, travel, standard FROM savings_balances WHERE id = 1`
  );
  const standard = Math.max(0, bal?.standard ?? 0);
  const emergency = Math.max(0, bal?.emergency ?? 0);
  const travel = Math.max(0, bal?.travel ?? 0);
  await db.runAsync(
    `UPDATE accounts SET balance = ?, updated_at = ? WHERE linked_bucket = 'future'`,
    standard,
    nowIso()
  );
  await db.runAsync(
    `UPDATE accounts SET balance = ?, updated_at = ? WHERE linked_bucket = 'emergency'`,
    emergency,
    nowIso()
  );
  await db.runAsync(
    `UPDATE accounts SET balance = ?, updated_at = ? WHERE linked_bucket = 'travel'`,
    travel,
    nowIso()
  );
}

export interface AddIncomeInput {
  amount: number;
  description?: string;
  category?: string;
  date: string;
}

export async function addIncomeTransaction(input: AddIncomeInput): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO transactions (amount, description, type, priority, category, date, emergency_alloc, travel_alloc, standard_alloc, disposable_alloc)
       VALUES (?, ?, 'income', NULL, ?, ?, NULL, NULL, NULL, NULL)`,
      input.amount,
      input.description ?? null,
      input.category ?? null,
      input.date
    );
    await recomputeSavingsBalancesWithDb(db);
  });
}

export interface AddExpenseInput {
  amount: number;
  description?: string;
  priority: ExpensePriority;
  category?: string;
  date: string;
  /** When true, expense is unpaid until marked on Transactions; date is treated as due date. */
  awaitingPayment?: boolean;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function addExpenseTransaction(input: AddExpenseInput): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    const pending = Boolean(input.awaitingPayment);
    const isPaid = pending ? 0 : 1;
    const dueDate = pending ? input.date : null;

    await db.runAsync(
      `INSERT INTO transactions (amount, description, type, priority, category, date, due_date, is_paid, emergency_alloc, travel_alloc, standard_alloc, disposable_alloc)
       VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
      input.amount,
      input.description ?? null,
      input.priority,
      input.category ?? null,
      input.date,
      dueDate,
      isPaid
    );
    await recomputeSavingsBalancesWithDb(db);
  });
}

export async function markExpensePaid(id: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    const paidOn = todayIso();
    await db.runAsync(
      `UPDATE transactions SET is_paid = 1, date = ? WHERE id = ? AND type = 'expense'`,
      paidOn,
      id
    );
    await recomputeSavingsBalancesWithDb(db);
  });
}

/** Return bill to unpaid; restore posting date from due date when possible (checklist bills only). */
export async function markExpenseUnpaid(id: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE transactions SET is_paid = 0, date = COALESCE(due_date, date) WHERE id = ? AND type = 'expense' AND due_date IS NOT NULL`,
      id
    );
    await recomputeSavingsBalancesWithDb(db);
  });
}

export async function getTransactions(): Promise<TransactionRow[]> {
  return runSerialized(() =>
    getDatabase().then((db) =>
      db.getAllAsync<TransactionRow>(
        `SELECT id, amount, description, type, priority, category, date, due_date, is_paid, emergency_alloc, travel_alloc, standard_alloc, disposable_alloc
         FROM transactions ORDER BY date DESC, id DESC`
      )
    )
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM transactions WHERE id = ?`, id);
    await recomputeSavingsBalancesWithDb(db);
  });
}

export interface UpdateTransactionInput {
  amount: number;
  description: string | null;
  category: string | null;
  date: string;
  type: TransactionType;
  priority: ExpensePriority | null;
  due_date: string | null;
  is_paid: number;
}

export async function updateTransaction(id: number, input: UpdateTransactionInput): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE transactions SET amount = ?, description = ?, category = ?, date = ?, type = ?, priority = ?, due_date = ?, is_paid = ?
       WHERE id = ?`,
      input.amount,
      input.description,
      input.category,
      input.date,
      input.type,
      input.priority,
      input.due_date,
      input.is_paid !== 0 ? 1 : 0,
      id
    );
    await recomputeSavingsBalancesWithDb(db);
  });
}

export async function getLoans(): Promise<LoanRow[]> {
  return runSerialized(() =>
    getDatabase().then((db) =>
      db.getAllAsync<LoanRow>(
        `SELECT id, name, total_amount, monthly_repayment, months_left, repayment_date, is_recurring, repayment_acknowledged_ym FROM loans ORDER BY name ASC`
      )
    )
  );
}

export interface SavingsBubbleRow {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  remind_enabled: number;
  remind_time: string | null;
  created_at: string;
}

export interface AccountRow {
  id: number;
  name: string;
  balance: number;
  linked_bubble_id: number | null;
  linked_bucket: string | null;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getSavingsBubbles(): Promise<SavingsBubbleRow[]> {
  return runSerialized(() =>
    getDatabase().then((db) =>
      db.getAllAsync<SavingsBubbleRow>(
        `SELECT id, name, target_amount, current_amount, target_date, remind_enabled, remind_time, created_at
         FROM savings_bubbles ORDER BY created_at DESC`
      )
    )
  );
}

export async function createSavingsBubble(input: {
  name: string;
  target_amount: number;
  target_date?: string | null;
  remind_enabled?: number;
  remind_time?: string | null;
}): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO savings_bubbles (name, target_amount, current_amount, target_date, remind_enabled, remind_time, created_at)
       VALUES (?, ?, 0, ?, ?, ?, ?)`,
      input.name,
      Math.max(0, input.target_amount),
      input.target_date ?? null,
      input.remind_enabled != null && Number(input.remind_enabled) === 0 ? 0 : 1,
      input.remind_time ?? null,
      nowIso()
    );
  });
}

export async function updateSavingsBubble(
  id: number,
  input: {
    name: string;
    target_amount: number;
    target_date?: string | null;
    remind_enabled?: number;
    remind_time?: string | null;
  }
): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE savings_bubbles
       SET name = ?, target_amount = ?, target_date = ?, remind_enabled = ?, remind_time = ?
       WHERE id = ?`,
      input.name,
      Math.max(0, input.target_amount),
      input.target_date ?? null,
      input.remind_enabled != null && Number(input.remind_enabled) === 0 ? 0 : 1,
      input.remind_time ?? null,
      id
    );
  });
}

/** Adjust bubble balance and mirror to linked account (if any). */
export async function adjustSavingsBubbleBalance(id: number, delta: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<{ current_amount: number }>(
        `SELECT current_amount FROM savings_bubbles WHERE id = ?`,
        id
      );
      const next = Math.max(0, (row?.current_amount ?? 0) + delta);
      await db.runAsync(`UPDATE savings_bubbles SET current_amount = ? WHERE id = ?`, next, id);
      await db.runAsync(
        `UPDATE accounts SET balance = ?, updated_at = ? WHERE linked_bubble_id = ?`,
        next,
        nowIso(),
        id
      );
    });
  });
}

export async function transferBetweenBubbles(input: {
  fromBubbleId: number;
  toBubbleId: number;
  amount: number;
}): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    const amt = input.amount;
    if (!Number.isFinite(amt) || amt <= 0) return;
    if (input.fromBubbleId === input.toBubbleId) return;
    await db.withTransactionAsync(async () => {
      const from = await db.getFirstAsync<{ current_amount: number }>(
        `SELECT current_amount FROM savings_bubbles WHERE id = ?`,
        input.fromBubbleId
      );
      const to = await db.getFirstAsync<{ current_amount: number }>(
        `SELECT current_amount FROM savings_bubbles WHERE id = ?`,
        input.toBubbleId
      );
      if (!from || !to) throw new Error('Bubble not found');
      const fromBal = Math.max(0, from.current_amount ?? 0);
      const toBal = Math.max(0, to.current_amount ?? 0);
      if (amt > fromBal) throw new Error('Not enough funds in the source bubble');

      const nextFrom = Math.max(0, fromBal - amt);
      const nextTo = Math.max(0, toBal + amt);

      await db.runAsync(`UPDATE savings_bubbles SET current_amount = ? WHERE id = ?`, nextFrom, input.fromBubbleId);
      await db.runAsync(`UPDATE savings_bubbles SET current_amount = ? WHERE id = ?`, nextTo, input.toBubbleId);

      // Mirror linked accounts for both bubbles.
      await db.runAsync(
        `UPDATE accounts SET balance = ?, updated_at = ? WHERE linked_bubble_id = ?`,
        nextFrom,
        nowIso(),
        input.fromBubbleId
      );
      await db.runAsync(
        `UPDATE accounts SET balance = ?, updated_at = ? WHERE linked_bubble_id = ?`,
        nextTo,
        nowIso(),
        input.toBubbleId
      );
    });
  });
}

export async function getAccounts(): Promise<AccountRow[]> {
  return runSerialized(() =>
    getDatabase().then((db) =>
      db.getAllAsync<AccountRow>(
        `SELECT id, name, balance, linked_bubble_id, linked_bucket, updated_at FROM accounts ORDER BY updated_at DESC`
      )
    )
  );
}

export async function getSafeToSpendMoves(): Promise<SafeToSpendMoveRow[]> {
  return runSerialized(() =>
    getDatabase().then((db) =>
      db.getAllAsync<SafeToSpendMoveRow>(
        `SELECT id, amount, date, bubble_id, kind, created_at FROM safe_to_spend_moves ORDER BY created_at DESC`
      )
    )
  );
}

export async function addSafeToSpendMove(input: {
  amount: number;
  date: string;
  bubble_id?: number | null;
  kind: 'deposit' | 'withdraw';
}): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO safe_to_spend_moves (amount, date, bubble_id, kind, created_at) VALUES (?, ?, ?, ?, ?)`,
      input.amount,
      input.date,
      input.bubble_id ?? null,
      input.kind,
      nowIso()
    );
  });
}

export async function createAccount(input: { name: string; balance: number }): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO accounts (name, balance, linked_bubble_id, linked_bucket, updated_at) VALUES (?, ?, NULL, NULL, ?)`,
      input.name,
      Math.max(0, input.balance),
      nowIso()
    );
  });
}

/** Update account balance; if linked, mirrors bubble balance. */
export async function updateAccountBalance(id: number, balance: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const next = Math.max(0, balance);
      const row = await db.getFirstAsync<{ linked_bubble_id: number | null; linked_bucket: string | null }>(
        `SELECT linked_bubble_id, linked_bucket FROM accounts WHERE id = ?`,
        id
      );
      if (row?.linked_bucket) {
        throw new Error('This account is linked to a system savings bucket. Unlink it to edit balance.');
      }
      await db.runAsync(
        `UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?`,
        next,
        nowIso(),
        id
      );
      const bubbleId = row?.linked_bubble_id ?? null;
      if (bubbleId) {
        await db.runAsync(
          `UPDATE savings_bubbles SET current_amount = ? WHERE id = ?`,
          next,
          bubbleId
        );
      }
    });
  });
}

/** Link account to a bubble and immediately mirror balance from the bubble (bubble is source of truth). */
export async function linkAccountToBubble(accountId: number, bubbleId: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const bubble = await db.getFirstAsync<{ current_amount: number }>(
        `SELECT current_amount FROM savings_bubbles WHERE id = ?`,
        bubbleId
      );
      const amt = Math.max(0, bubble?.current_amount ?? 0);
      await db.runAsync(
        `UPDATE accounts SET linked_bubble_id = ?, linked_bucket = NULL, balance = ?, updated_at = ? WHERE id = ?`,
        bubbleId,
        amt,
        nowIso(),
        accountId
      );
    });
  });
}

export async function unlinkAccount(accountId: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE accounts SET linked_bubble_id = NULL, linked_bucket = NULL, updated_at = ? WHERE id = ?`,
      nowIso(),
      accountId
    );
  });
}

export type SystemSavingsBucket = 'future' | 'emergency' | 'travel';

export async function linkAccountToSystemBucket(accountId: number, bucket: SystemSavingsBucket): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      const bal = await db.getFirstAsync<{ emergency: number; travel: number; standard: number }>(
        `SELECT emergency, travel, standard FROM savings_balances WHERE id = 1`
      );
      const amount =
        bucket === 'future'
          ? Math.max(0, bal?.standard ?? 0)
          : bucket === 'emergency'
            ? Math.max(0, bal?.emergency ?? 0)
            : Math.max(0, bal?.travel ?? 0);
      await db.runAsync(
        `UPDATE accounts SET linked_bubble_id = NULL, linked_bucket = ?, balance = ?, updated_at = ? WHERE id = ?`,
        bucket,
        amount,
        nowIso(),
        accountId
      );
    });
  });
}

/**
 * Transfer between an UNLINKED account and a bubble.
 * - When amount > 0: account -> bubble
 * - When amount < 0: bubble -> account
 * If the bubble has linked accounts, their balances will be mirrored to the bubble after the update.
 */
export async function transferBetweenAccountAndBubble(input: {
  accountId: number;
  bubbleId: number;
  amount: number;
}): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    const amt = input.amount;
    if (!Number.isFinite(amt) || amt === 0) return;
    await db.withTransactionAsync(async () => {
      const acc = await db.getFirstAsync<{ balance: number; linked_bubble_id: number | null; linked_bucket: string | null }>(
        `SELECT balance, linked_bubble_id, linked_bucket FROM accounts WHERE id = ?`,
        input.accountId
      );
      if (!acc) throw new Error('Account not found');
      if (acc.linked_bubble_id) throw new Error('Transfers are only allowed for unlinked accounts');
      if (acc.linked_bucket) throw new Error('Transfers are only allowed for unlinked accounts');

      const bub = await db.getFirstAsync<{ current_amount: number }>(
        `SELECT current_amount FROM savings_bubbles WHERE id = ?`,
        input.bubbleId
      );
      if (!bub) throw new Error('Bubble not found');

      const accBal = Math.max(0, acc.balance ?? 0);
      const bubBal = Math.max(0, bub.current_amount ?? 0);

      if (amt > 0 && amt > accBal) throw new Error('Not enough funds in the account');
      if (amt < 0 && -amt > bubBal) throw new Error('Not enough funds in the bubble');

      const nextAcc = Math.max(0, accBal - amt);
      const nextBub = Math.max(0, bubBal + amt);

      await db.runAsync(
        `UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?`,
        nextAcc,
        nowIso(),
        input.accountId
      );
      await db.runAsync(
        `UPDATE savings_bubbles SET current_amount = ? WHERE id = ?`,
        nextBub,
        input.bubbleId
      );

      // Mirror any linked accounts to this bubble.
      await db.runAsync(
        `UPDATE accounts SET balance = ?, updated_at = ? WHERE linked_bubble_id = ?`,
        nextBub,
        nowIso(),
        input.bubbleId
      );
    });
  });
}

export interface AddLoanInput {
  name: string;
  total_amount: number;
  monthly_repayment: number;
  months_left: number;
  repayment_date?: string | null;
  is_recurring?: boolean;
}

function defaultNextRecurringRepaymentIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function addLoan(input: AddLoanInput): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    const recurring = input.is_recurring !== false ? 1 : 0;
    let repayDate = input.repayment_date?.trim() || null;
    if (recurring && !repayDate) {
      repayDate = defaultNextRecurringRepaymentIso();
    }
    await db.runAsync(
      `INSERT INTO loans (name, total_amount, monthly_repayment, months_left, repayment_date, is_recurring, repayment_acknowledged_ym) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      input.name,
      input.total_amount,
      input.monthly_repayment,
      Math.max(0, Math.floor(input.months_left)),
      repayDate,
      recurring
    );
    await recomputeSavingsBalancesWithDb(db);
  });
}

export async function updateLoan(id: number, input: AddLoanInput): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    const recurring = input.is_recurring !== false ? 1 : 0;
    let repayDate = input.repayment_date?.trim() || null;
    if (recurring && !repayDate) {
      repayDate = defaultNextRecurringRepaymentIso();
    }
    await db.runAsync(
      `UPDATE loans SET name = ?, total_amount = ?, monthly_repayment = ?, months_left = ?, repayment_date = ?, is_recurring = ? WHERE id = ?`,
      input.name,
      input.total_amount,
      input.monthly_repayment,
      Math.max(0, Math.floor(input.months_left)),
      repayDate,
      recurring,
      id
    );
    await recomputeSavingsBalancesWithDb(db);
  });
}

export async function deleteLoan(id: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM loans WHERE id = ?`, id);
    await recomputeSavingsBalancesWithDb(db);
  });
}

export async function markLoanRepaymentAcknowledged(id: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE loans SET repayment_acknowledged_ym = ?, months_left = CASE WHEN COALESCE(is_recurring, 1) = 0 THEN 0 ELSE months_left END WHERE id = ?`,
      monthKey(new Date()),
      id
    );
    await recomputeSavingsBalancesWithDb(db);
  });
}

/** Clear this month’s tick; restore one-off loans to 1 month left when they were marked done. */
export async function markLoanRepaymentUnacknowledged(id: number): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE loans SET repayment_acknowledged_ym = NULL, months_left = CASE WHEN COALESCE(is_recurring, 1) = 0 AND months_left = 0 THEN 1 ELSE months_left END WHERE id = ?`,
      id
    );
    await recomputeSavingsBalancesWithDb(db);
  });
}

/** All settings rows for backup */
export async function getAllSettingsRows(): Promise<Record<string, string>> {
  return runSerialized(async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>(`SELECT key, value FROM settings`);
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  });
}

export async function replaceAllData(payload: {
  settings: Record<string, string>;
  transactions: {
    amount: number;
    description: string | null;
    type: TransactionType;
    priority: ExpensePriority | null;
    category: string | null;
    date: string;
    due_date: string | null;
    is_paid: number;
    emergency_alloc: number | null;
    travel_alloc: number | null;
    standard_alloc: number | null;
    disposable_alloc: number | null;
  }[];
  loans: {
    name: string;
    total_amount: number;
    monthly_repayment: number;
    months_left: number;
    repayment_date: string | null;
    is_recurring: number;
    repayment_acknowledged_ym: string | null;
  }[];
  savings_bubbles?: {
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
    remind_enabled: number;
    remind_time: string | null;
    created_at: string;
  }[];
  accounts?: {
    id: number;
    name: string;
    balance: number;
    linked_bubble_id: number | null;
    linked_bucket: string | null;
    updated_at: string;
  }[];
  safe_to_spend_moves?: {
    amount: number;
    date: string;
    bubble_id: number | null;
    kind: 'deposit' | 'withdraw';
    created_at: string;
  }[];
  savings_balances: SavingsBalances;
}): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM transactions`);
      await db.runAsync(`DELETE FROM loans`);
      await db.runAsync(`DELETE FROM savings_bubbles`);
      await db.runAsync(`DELETE FROM accounts`);
      await db.runAsync(`DELETE FROM safe_to_spend_moves`);
      await db.runAsync(`DELETE FROM settings`);

      for (const [k, v] of Object.entries(payload.settings)) {
        await db.runAsync(`INSERT INTO settings (key, value) VALUES (?, ?)`, k, v);
      }

      for (const t of payload.transactions) {
        await db.runAsync(
          `INSERT INTO transactions (amount, description, type, priority, category, date, due_date, is_paid, emergency_alloc, travel_alloc, standard_alloc, disposable_alloc)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          t.amount,
          t.description,
          t.type,
          t.priority,
          t.category,
          t.date,
          t.due_date ?? null,
          t.is_paid !== 0 ? 1 : 0,
          t.emergency_alloc,
          t.travel_alloc,
          t.standard_alloc,
          t.disposable_alloc ?? null
        );
      }

      for (const l of payload.loans) {
        await db.runAsync(
          `INSERT INTO loans (name, total_amount, monthly_repayment, months_left, repayment_date, is_recurring, repayment_acknowledged_ym) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          l.name,
          l.total_amount,
          l.monthly_repayment,
          l.months_left,
          l.repayment_date ?? null,
          l.is_recurring !== 0 ? 1 : 0,
          l.repayment_acknowledged_ym ?? null
        );
      }

      // Restore bubbles first so accounts can link (id mapping).
      const bubbleIdMap = new Map<number, number>();
      for (const b of payload.savings_bubbles ?? []) {
        const res = await db.runAsync(
          `INSERT INTO savings_bubbles (name, target_amount, current_amount, target_date, remind_enabled, remind_time, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          b.name,
          Math.max(0, b.target_amount),
          Math.max(0, b.current_amount),
          b.target_date ?? null,
          b.remind_enabled != null && Number(b.remind_enabled) === 0 ? 0 : 1,
          b.remind_time ?? null,
          b.created_at
        );
        // expo-sqlite returns lastInsertRowId on result
        const newId = Number((res as unknown as { lastInsertRowId?: number }).lastInsertRowId ?? 0);
        const oldId = Number(b.id);
        if (newId > 0 && Number.isFinite(oldId)) bubbleIdMap.set(oldId, newId);
      }

      for (const a of payload.accounts ?? []) {
        const linked =
          a.linked_bubble_id != null ? bubbleIdMap.get(a.linked_bubble_id) ?? null : null;
        await db.runAsync(
          `INSERT INTO accounts (name, balance, linked_bubble_id, linked_bucket, updated_at) VALUES (?, ?, ?, ?, ?)`,
          a.name,
          Math.max(0, a.balance),
          linked,
          a.linked_bucket ?? null,
          a.updated_at
        );
      }

      for (const m of payload.safe_to_spend_moves ?? []) {
        const bubbleId = m.bubble_id != null ? bubbleIdMap.get(m.bubble_id) ?? null : null;
        await db.runAsync(
          `INSERT INTO safe_to_spend_moves (amount, date, bubble_id, kind, created_at) VALUES (?, ?, ?, ?, ?)`,
          Number(m.amount),
          String(m.date),
          bubbleId,
          m.kind === 'withdraw' ? 'withdraw' : 'deposit',
          String(m.created_at ?? nowIso())
        );
      }

      await recomputeSavingsBalancesWithDb(db);
    });
  });
}

export async function resetAllData(): Promise<void> {
  return runSerialized(async () => {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM transactions`);
      await db.runAsync(`DELETE FROM loans`);
      await db.runAsync(`DELETE FROM savings_bubbles`);
      await db.runAsync(`DELETE FROM accounts`);
      await db.runAsync(`DELETE FROM safe_to_spend_moves`);
      await db.runAsync(`DELETE FROM settings`);

      await db.runAsync(
        `INSERT OR IGNORE INTO savings_balances (id, emergency, travel, standard, disposable) VALUES (1, 0, 0, 0, 0)`
      );
      await db.runAsync(`UPDATE savings_balances SET emergency = 0, travel = 0, standard = 0, disposable = 0 WHERE id = 1`);

      const defaults: [string, string][] = [
        ['emergency_pct', '10'],
        ['travel_pct', '10'],
        ['standard_pct', '10'],
        ['theme_preference', 'system'],
        [SETTING_ONBOARDING_DONE, '0'],
        [SETTING_NOTIFICATIONS_ENABLED, '1'],
        ['budget_period_end_day', '0'],
        ['loan_tick_ym', monthKey(new Date())],
        [SETTING_CARRYOVER_SAFE_TO_SPEND, '0'],
        [SETTING_LOAN_NOTIFY_ENABLED, '1'],
        [SETTING_LOAN_NOTIFY_DAYS_BEFORE, '3'],
        [SETTING_LOAN_NOTIFY_TIME, '09:00'],
        [BUDGET_RATE_SETTING_KEYS.disposable, '40'],
        [BUDGET_RATE_SETTING_KEYS.future, '40'],
        [BUDGET_RATE_SETTING_KEYS.emergency, '40'],
        [BUDGET_RATE_SETTING_KEYS.travel, '20'],
      ];
      for (const [k, v] of defaults) {
        await db.runAsync(`INSERT INTO settings (key, value) VALUES (?, ?)`, k, v);
      }
    });
  });
}
