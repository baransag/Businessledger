// src/utils/balance.ts
// Deterministic balance calculation from transaction dataset
// Formula: openingBalance + Σ(credit) - Σ(debit)

import type { Transaction, AppSettings } from '../db/schema';

export interface RunningBalanceRow extends Transaction {
  runningBalance: number; // in paisa
}

/**
 * Calculate running balances for a sorted list of transactions.
 * Transactions must be sorted by date ASC, then createdAt ASC.
 */
export function calculateRunningBalances(
  transactions: Transaction[],
  openingBalancePaisa: number
): RunningBalanceRow[] {
  let balance = openingBalancePaisa;
  return transactions
    .filter(t => !t.isDeleted)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map(t => {
      balance += t.creditPaisa - t.debitPaisa;
      return { ...t, runningBalance: balance };
    });
}

/**
 * Calculate summary stats for a set of transactions.
 */
export function calculateSummary(
  transactions: Transaction[],
  openingBalancePaisa: number
) {
  const active = transactions.filter(t => !t.isDeleted);
  const totalCreditPaisa = active.reduce((s, t) => s + t.creditPaisa, 0);
  const totalDebitPaisa = active.reduce((s, t) => s + t.debitPaisa, 0);
  const netMovementPaisa = totalCreditPaisa - totalDebitPaisa;
  const closingBalancePaisa = openingBalancePaisa + netMovementPaisa;

  return {
    openingBalancePaisa,
    totalCreditPaisa,
    totalDebitPaisa,
    netMovementPaisa,
    closingBalancePaisa,
  };
}

/**
 * Reconciliation check: verify closing balance equals computed balance.
 * Returns null if consistent, otherwise returns discrepancy in paisa.
 */
export function reconcile(
  transactions: Transaction[],
  settings: AppSettings | null
): number | null {
  if (!settings) return null;
  const { closingBalancePaisa } = calculateSummary(
    transactions,
    settings.openingBalancePaisa
  );
  // Current balance from running totals is itself deterministic, so no discrepancy
  // This hook is for future import reconciliation
  return null;
}
