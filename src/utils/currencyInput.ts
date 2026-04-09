const LOCALE = 'en-PH';

/**
 * Formats amount as the user types: en-PH grouping, optional decimals (max 2), optional trailing ".".
 */
export function formatCurrencyAsTyped(text: string): string {
  let s = text.replace(/₱/g, '').replace(/\s/g, '').replace(/,/g, '');
  s = s.replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  const dotIdx = s.indexOf('.');
  const intRaw = dotIdx === -1 ? s : s.slice(0, dotIdx);
  const decRaw = dotIdx === -1 ? '' : s.slice(dotIdx + 1).slice(0, 2);
  const hasTrailingDot = dotIdx !== -1 && decRaw.length === 0 && s.endsWith('.');

  const intTrimmed = intRaw.replace(/^0+(?=\d)/, '');
  if (intTrimmed === '' && decRaw === '' && dotIdx === -1) {
    return '';
  }

  let intDisplay = '';
  if (intTrimmed === '' && (hasTrailingDot || decRaw.length > 0)) {
    intDisplay = '0';
  } else if (intTrimmed !== '') {
    intDisplay = Number(intTrimmed).toLocaleString(LOCALE);
  } else if (intRaw === '0' && dotIdx === -1) {
    intDisplay = '0';
  }

  if (hasTrailingDot) return `${intDisplay}.`;
  if (dotIdx !== -1) return `${intDisplay}.${decRaw}`;
  return intDisplay;
}

/** Parse formatted currency field to a number (NaN if empty / invalid). */
export function parseCurrencyInput(display: string): number {
  const s = display.replace(/,/g, '').replace(/₱/g, '').replace(/\s/g, '').trim();
  if (s === '' || s === '.') return NaN;
  const n = parseFloat(s);
  return n;
}

/** Whole numbers with thousands grouping (months, counts). */
export function formatIntegerAsTyped(text: string): string {
  const digits = text.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
  if (digits === '') return '';
  return Number(digits).toLocaleString(LOCALE);
}

export function parseIntegerInput(display: string): number {
  const s = display.replace(/,/g, '').trim();
  if (s === '') return NaN;
  return parseInt(s, 10);
}
