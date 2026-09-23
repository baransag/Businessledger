// src/sync/syncEngine.ts
// Cloud sync between local IndexedDB (Dexie) and Supabase
// Strategy: last-write-wins based on updatedAt timestamp

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { db } from '../db/db';
import type { Transaction, AppSettings, Category, PaymentMethod, Account } from '../db/schema';

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  error?: string;
}

// ─── Mapping: local camelCase → Supabase snake_case ───────────────────

function txnToRow(t: Transaction) {
  return {
    id:               t.id,
    user_id:          t.userId,
    date:             t.date,
    party_name:       t.partyName,
    description:      t.description,
    category:         t.category,
    payment_method:   t.paymentMethod,
    reference_number: t.referenceNumber,
    debit_paisa:      t.debitPaisa,
    credit_paisa:     t.creditPaisa,
    notes:            t.notes,
    is_deleted:       t.isDeleted,
    deleted_at:       t.deletedAt,
    created_at:       t.createdAt,
    updated_at:       t.updatedAt,
    account_id:       t.accountId || '',
    transfer_id:      t.transferId || '',
    sync_status:      'synced',
  };
}

function rowToTxn(row: Record<string, unknown>): Transaction {
  return {
    id:              row.id as string,
    userId:          row.user_id as string,
    date:            row.date as string,
    partyName:       row.party_name as string,
    description:     row.description as string,
    category:        row.category as string,
    paymentMethod:   row.payment_method as string,
    referenceNumber: row.reference_number as string,
    debitPaisa:      Number(row.debit_paisa),
    creditPaisa:     Number(row.credit_paisa),
    notes:           row.notes as string,
    isDeleted:       Boolean(row.is_deleted),
    deletedAt:       row.deleted_at as number | null,
    createdAt:       Number(row.created_at),
    updatedAt:       Number(row.updated_at),
    accountId:       (row.account_id as string) || '',
    transferId:      (row.transfer_id as string) || '',
    syncStatus:      'synced',
  };
}

function settingsToRow(s: AppSettings) {
  return {
    id:                       s.id,
    user_id:                  s.userId,
    opening_balance_paisa:    s.openingBalancePaisa,
    opening_balance_date:     s.openingBalanceDate,
    opening_balance_note:     s.openingBalanceNote,
    business_title:           s.businessTitle,
    currency_symbol:          s.currencySymbol,
    date_format:              s.dateFormat,
    pdf_header:               s.pdfHeader,
    durood_banner_visible:    s.duroodBannerVisible,
    last_sync_at:             s.lastSyncAt,
    updated_at:               s.updatedAt,
    sync_status:              'synced',
  };
}

function rowToSettings(row: Record<string, unknown>): AppSettings {
  return {
    id:                   row.id as string,
    userId:               row.user_id as string,
    openingBalancePaisa:  Number(row.opening_balance_paisa),
    openingBalanceDate:   row.opening_balance_date as string,
    openingBalanceNote:   row.opening_balance_note as string,
    businessTitle:        row.business_title as string,
    currencySymbol:       row.currency_symbol as string,
    dateFormat:           row.date_format as string,
    pdfHeader:            row.pdf_header as string,
    duroodBannerVisible:  Boolean(row.durood_banner_visible),
    lastSyncAt:           Number(row.last_sync_at),
    updatedAt:            Number(row.updated_at),
    syncStatus:           'synced',
  };
}

// ─── Main Sync Function ────────────────────────────────────────────────

export async function syncTransactions(userId: string): Promise<SyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { pushed: 0, pulled: 0, conflicts: 0, error: 'Supabase not configured' };
  }

  const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0 };

  try {
    // ── PUSH: local pending → Supabase ──────────────────────────────
    const pendingTxns = await db.transactions
      .where('userId').equals(userId)
      .and(t => t.syncStatus === 'pending')
      .toArray();

    if (pendingTxns.length > 0) {
      const rows = pendingTxns.map(txnToRow);
      const { error } = await supabase
        .from('transactions')
        .upsert(rows, { onConflict: 'id' });

      if (error) throw new Error(`Push failed: ${error.message}`);

      // Mark as synced locally
      await Promise.all(
        pendingTxns.map(t => db.transactions.update(t.id, { syncStatus: 'synced' }))
      );
      result.pushed = pendingTxns.length;
    }

    // ── PULL: Supabase → local (last-write-wins) ─────────────────────
    // Find our most recent locally-synced updatedAt
    const localSynced = await db.transactions
      .where('userId').equals(userId)
      .and(t => t.syncStatus === 'synced')
      .toArray();

    const lastPulledAt = localSynced.length > 0
      ? Math.max(...localSynced.map(t => t.updatedAt))
      : 0;

    const { data: remoteTxns, error: pullError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', lastPulledAt);

    if (pullError) throw new Error(`Pull failed: ${pullError.message}`);

    if (remoteTxns && remoteTxns.length > 0) {
      for (const row of remoteTxns) {
        const remote = rowToTxn(row as Record<string, unknown>);
        const local = await db.transactions.get(remote.id);

        if (!local) {
          // New from server
          await db.transactions.add(remote);
          result.pulled++;
        } else if (remote.updatedAt > local.updatedAt) {
          // Remote is newer — overwrite local
          await db.transactions.put(remote);
          result.pulled++;
        } else if (local.updatedAt > remote.updatedAt && local.syncStatus === 'pending') {
          // Local is newer — already pushed above, count as conflict resolved
          result.conflicts++;
        }
      }
    }

    // ── SYNC SETTINGS ────────────────────────────────────────────────
    await syncSettings(userId);

    // ── SYNC CATEGORIES ──────────────────────────────────────────────
    await syncCategories(userId);

    // ── SYNC PAYMENT METHODS ─────────────────────────────────────────
    await syncPaymentMethods(userId);

    // ── SYNC ACCOUNTS ────────────────────────────────────────────────
    await syncAccounts(userId);

    // Update lastSyncAt in settings
    await db.settings.update('singleton', { lastSyncAt: Date.now() });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    return { ...result, error: message };
  }
}

async function syncSettings(userId: string): Promise<void> {
  if (!supabase) return;
  const local = await db.settings.get('singleton');
  if (!local) return;

  if (local.syncStatus === 'pending') {
    await supabase
      .from('settings')
      .upsert(settingsToRow(local), { onConflict: 'id' });
    await db.settings.update('singleton', { syncStatus: 'synced' });
  }

  const { data } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (data) {
    const remote = rowToSettings(data as Record<string, unknown>);
    if (!local || remote.updatedAt > local.updatedAt) {
      await db.settings.put({ ...remote, id: 'singleton' });
    }
  }
}

async function syncCategories(userId: string): Promise<void> {
  if (!supabase) return;
  const pending = await db.categories
    .where('userId').equals(userId)
    .toArray();

  if (pending.length > 0) {
    await supabase.from('categories').upsert(
      pending.map(c => ({ id: c.id, user_id: c.userId, name: c.name, is_default: c.isDefault, created_at: c.createdAt })),
      { onConflict: 'id' }
    );
  }

  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId);

  if (data) {
    for (const row of data) {
      const existing = await db.categories.get(row.id as string);
      if (!existing) {
        await db.categories.add({
          id: row.id as string,
          userId: row.user_id as string,
          name: row.name as string,
          isDefault: Boolean(row.is_default),
          createdAt: Number(row.created_at),
        });
      }
    }
  }
}

async function syncPaymentMethods(userId: string): Promise<void> {
  if (!supabase) return;
  const pending = await db.paymentMethods
    .where('userId').equals(userId)
    .toArray();

  if (pending.length > 0) {
    await supabase.from('payment_methods').upsert(
      pending.map(p => ({ id: p.id, user_id: p.userId, name: p.name, is_default: p.isDefault, created_at: p.createdAt })),
      { onConflict: 'id' }
    );
  }

  const { data } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', userId);

  if (data) {
    for (const row of data) {
      const existing = await db.paymentMethods.get(row.id as string);
      if (!existing) {
        await db.paymentMethods.add({
          id: row.id as string,
          userId: row.user_id as string,
          name: row.name as string,
          isDefault: Boolean(row.is_default),
          createdAt: Number(row.created_at),
        });
      }
    }
  }
}

// ─── Account Sync ────────────────────────────────────────────────────

function accountToRow(a: Account) {
  return {
    id:                    a.id,
    user_id:               a.userId,
    name:                  a.name,
    type:                  a.type,
    icon:                  a.icon,
    color:                 a.color,
    opening_balance_paisa: a.openingBalancePaisa,
    is_active:             a.isActive,
    created_at:            a.createdAt,
    updated_at:            a.updatedAt,
    sync_status:           'synced',
  };
}

async function syncAccounts(userId: string): Promise<void> {
  if (!supabase) return;

  // Push local pending accounts
  const localAccounts = await db.accounts
    .where('userId').equals(userId)
    .toArray();

  const pending = localAccounts.filter(a => a.syncStatus === 'pending');
  if (pending.length > 0) {
    await supabase.from('accounts').upsert(
      pending.map(accountToRow),
      { onConflict: 'id' }
    );
    await Promise.all(
      pending.map(a => db.accounts.update(a.id, { syncStatus: 'synced' }))
    );
  }

  // Pull remote accounts
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);

  if (data) {
    for (const row of data) {
      const existing = await db.accounts.get(row.id as string);
      if (!existing) {
        await db.accounts.add({
          id: row.id as string,
          userId: row.user_id as string,
          name: row.name as string,
          type: (row.type as 'bank' | 'wallet') || 'bank',
          icon: (row.icon as string) || '🏦',
          color: (row.color as string) || '#4A90D9',
          openingBalancePaisa: Number(row.opening_balance_paisa) || 0,
          isActive: row.is_active !== false,
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at),
          syncStatus: 'synced',
        });
      } else if (Number(row.updated_at) > existing.updatedAt) {
        await db.accounts.put({
          ...existing,
          name: row.name as string,
          type: (row.type as 'bank' | 'wallet') || 'bank',
          icon: (row.icon as string) || '🏦',
          color: (row.color as string) || '#4A90D9',
          openingBalancePaisa: Number(row.opening_balance_paisa) || 0,
          isActive: row.is_active !== false,
          updatedAt: Number(row.updated_at),
          syncStatus: 'synced',
        });
      }
    }
  }
}
