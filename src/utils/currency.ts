const LOCALE = 'en-PH';
const CURRENCY = 'PHP';

let formatter: Intl.NumberFormat | null = null;

function getFormatter(): Intl.NumberFormat {
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return formatter;
}

/** Philippine peso (₱), grouped per en-PH locale. */
export function formatPhp(amount: number): string {
  try {
    return getFormatter().format(amount);
  } catch {
    const sign = amount < 0 ? '−' : '';
    return `${sign}₱${Math.abs(amount).toFixed(2)}`;
  }
}

/** For ledger lines: +₱… / −₱… */
export function formatPhpLedger(amount: number, type: 'income' | 'expense'): string {
  const core = formatPhp(Math.abs(amount));
  return type === 'income' ? `+${core}` : `−${core}`;
}
