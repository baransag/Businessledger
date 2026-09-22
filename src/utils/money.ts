// src/utils/money.ts
// All monetary amounts are stored as integer paisa (PKR × 100)
// This eliminates all floating-point rounding errors

/**
 * Convert a display rupee string/number to integer paisa.
 * e.g. 1500.50 → 150050
 */
export function rupeesToPaisa(rupees: number | string): number {
  const val = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

/**
 * Convert integer paisa to rupee float for display.
 * e.g. 150050 → 1500.50
 */
export function paisaToRupees(paisa: number): number {
  return paisa / 100;
}

/**
 * Format paisa as "Rs. 1,50,000" display string.
 */
export function formatPKR(paisa: number): string {
  const rupees = paisa / 100;
  return 'Rs. ' + rupees.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Format paisa as plain number string for inputs.
 */
export function formatRupeesInput(paisa: number): string {
  if (paisa === 0) return '';
  return (paisa / 100).toString();
}

/**
 * Safe addition of paisa values (integer arithmetic, no float drift).
 */
export function addPaisa(...values: number[]): number {
  return values.reduce((acc, v) => acc + Math.round(v), 0);
}

/**
 * Safe subtraction of paisa values.
 */
export function subtractPaisa(a: number, b: number): number {
  return Math.round(a) - Math.round(b);
}
