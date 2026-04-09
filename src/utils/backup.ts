import type { BackupPayload } from '@/db/types';
import {
  getAccounts,
  getAllSettingsRows,
  getLoans,
  getSafeToSpendMoves,
  getSavingsBalances,
  getSavingsBubbles,
  getTransactions,
  replaceAllData,
} from '@/db/db';

const BACKUP_VERSION = 1;

export async function buildBackupJson(): Promise<string> {
  const [settings, transactions, loans, savings_balances, savings_bubbles, accounts, safe_to_spend_moves] =
    await Promise.all([
    getAllSettingsRows(),
    getTransactions(),
    getLoans(),
    getSavingsBalances(),
    getSavingsBubbles(),
    getAccounts(),
    getSafeToSpendMoves(),
  ]);

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    transactions: transactions.map(({ id: _id, ...rest }) => rest),
    loans: loans.map(({ id: _id, ...rest }) => rest),
    savings_balances,
    savings_bubbles,
    accounts,
    safe_to_spend_moves: safe_to_spend_moves.map(({ id: _id, ...rest }) => rest),
  };

  return JSON.stringify(payload, null, 2);
}

export async function applyBackupJson(raw: string): Promise<void> {
  let data: BackupPayload;
  try {
    data = JSON.parse(raw) as BackupPayload;
  } catch {
    throw new Error('Invalid JSON file');
  }

  if (data.version !== 1 || !data.settings || !Array.isArray(data.transactions)) {
    throw new Error('Unrecognized backup format');
  }

  const nowYm = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const settings = { ...data.settings };
  if (!settings.loan_tick_ym) settings.loan_tick_ym = nowYm;

  await replaceAllData({
    settings,
    transactions: data.transactions.map((t) => ({
      amount: Number(t.amount),
      description: t.description ?? null,
      type: t.type,
      priority: t.priority ?? null,
      category: t.category ?? null,
      date: t.date,
      due_date: t.due_date ?? null,
      is_paid: t.is_paid != null && Number(t.is_paid) === 0 ? 0 : 1,
      emergency_alloc: t.emergency_alloc ?? null,
      travel_alloc: t.travel_alloc ?? null,
      standard_alloc: t.standard_alloc ?? null,
      disposable_alloc: t.disposable_alloc ?? null,
    })),
    loans: (data.loans ?? []).map((l) => ({
      name: String(l.name),
      total_amount: Number(l.total_amount),
      monthly_repayment: Number(l.monthly_repayment),
      months_left: Math.max(0, Math.floor(Number(l.months_left))),
      repayment_date: l.repayment_date != null && String(l.repayment_date).trim() !== '' ? String(l.repayment_date) : null,
      is_recurring: l.is_recurring != null && Number(l.is_recurring) === 0 ? 0 : 1,
      repayment_acknowledged_ym:
        l.repayment_acknowledged_ym != null && String(l.repayment_acknowledged_ym).trim() !== ''
          ? String(l.repayment_acknowledged_ym)
          : null,
    })),
    savings_bubbles: (data.savings_bubbles ?? []).map((b) => ({
      id: Number(b.id),
      name: String(b.name),
      target_amount: Math.max(0, Number(b.target_amount ?? 0)),
      current_amount: Math.max(0, Number(b.current_amount ?? 0)),
      target_date: b.target_date != null && String(b.target_date).trim() !== '' ? String(b.target_date) : null,
      remind_enabled: b.remind_enabled != null && Number(b.remind_enabled) === 0 ? 0 : 1,
      remind_time: b.remind_time != null && String(b.remind_time).trim() !== '' ? String(b.remind_time) : null,
      created_at: String(b.created_at ?? new Date().toISOString()),
    })),
    accounts: (data.accounts ?? []).map((a) => ({
      id: Number(a.id),
      name: String(a.name),
      balance: Math.max(0, Number(a.balance ?? 0)),
      linked_bubble_id:
        a.linked_bubble_id != null && Number.isFinite(Number(a.linked_bubble_id))
          ? Number(a.linked_bubble_id)
          : null,
      linked_bucket: a.linked_bucket != null && String(a.linked_bucket).trim() !== '' ? String(a.linked_bucket) : null,
      updated_at: String(a.updated_at ?? new Date().toISOString()),
    })),
    savings_balances: {
      emergency: Number(data.savings_balances?.emergency ?? 0),
      travel: Number(data.savings_balances?.travel ?? 0),
      standard: Number(data.savings_balances?.standard ?? 0),
      disposable: Number(data.savings_balances?.disposable ?? 0),
    },
    safe_to_spend_moves: (data.safe_to_spend_moves ?? []).map((m) => ({
      amount: Number(m.amount),
      date: String(m.date),
      bubble_id:
        m.bubble_id != null && Number.isFinite(Number(m.bubble_id)) ? Number(m.bubble_id) : null,
      kind: m.kind === 'withdraw' ? 'withdraw' : 'deposit',
      created_at: String(m.created_at ?? new Date().toISOString()),
    })),
  });
}
