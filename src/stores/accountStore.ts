// src/stores/accountStore.ts
// Zustand store for financial account management

import { create } from 'zustand';
import { db } from '../db/db';
import type { Account, Transaction } from '../db/schema';
import { PRESET_ACCOUNTS } from '../db/schema';
import { todayISO } from '../utils/dateUtils';

function genId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface AccountWithBalance extends Account {
  balance: number;       // opening + credits - debits (paisa)
  totalCredit: number;   // total inflow paisa
  totalDebit: number;    // total outflow paisa
  txnCount: number;      // number of transactions
}

interface AccountState {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;

  loadAccounts: (userId: string) => Promise<void>;
  seedDefaultAccounts: (userId: string) => Promise<void>;
  addAccount: (data: Partial<Account>, userId: string) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  toggleAccount: (id: string) => Promise<void>;
  getAccountsWithBalance: (transactions: Transaction[]) => AccountWithBalance[];
  transferBetweenAccounts: (
    fromAccountId: string,
    toAccountId: string,
    amountPaisa: number,
    userId: string,
    description?: string,
    date?: string
  ) => Promise<void>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  isLoading: false,
  error: null,

  loadAccounts: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const accounts = await db.accounts.where('userId').equals(userId).toArray();
      // Seed defaults if no accounts exist yet
      if (accounts.length === 0) {
        await get().seedDefaultAccounts(userId);
        return;
      }
      set({ accounts, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Unable to load accounts.' });
    }
  },

  seedDefaultAccounts: async (userId: string) => {
    const now = Date.now();
    const newAccounts: Account[] = PRESET_ACCOUNTS.map(preset => ({
      id: genId(),
      userId,
      name: preset.name,
      type: preset.type,
      icon: preset.icon,
      color: preset.color,
      openingBalancePaisa: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending' as const,
    }));
    await db.accounts.bulkAdd(newAccounts);
    set({ accounts: newAccounts, isLoading: false });
  },

  addAccount: async (data, userId) => {
    const now = Date.now();
    const account: Account = {
      id: genId(),
      userId,
      name: data.name || 'New Account',
      type: data.type || 'bank',
      icon: data.icon || '🏦',
      color: data.color || '#4A90D9',
      openingBalancePaisa: data.openingBalancePaisa || 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    };
    await db.accounts.add(account);
    await get().loadAccounts(userId);
  },

  updateAccount: async (id, data) => {
    const account = await db.accounts.get(id);
    if (!account) return;
    await db.accounts.update(id, { ...data, updatedAt: Date.now(), syncStatus: 'pending' });
    await get().loadAccounts(account.userId);
  },

  toggleAccount: async (id) => {
    const account = await db.accounts.get(id);
    if (!account) return;
    await db.accounts.update(id, {
      isActive: !account.isActive,
      updatedAt: Date.now(),
      syncStatus: 'pending',
    });
    await get().loadAccounts(account.userId);
  },

  getAccountsWithBalance: (transactions: Transaction[]): AccountWithBalance[] => {
    const { accounts } = get();
    const activeTxns = transactions.filter(t => !t.isDeleted);

    return accounts.map(account => {
      const acctTxns = activeTxns.filter(t => t.accountId === account.id);
      const totalCredit = acctTxns.reduce((s, t) => s + t.creditPaisa, 0);
      const totalDebit = acctTxns.reduce((s, t) => s + t.debitPaisa, 0);
      const balance = account.openingBalancePaisa + totalCredit - totalDebit;

      return {
        ...account,
        balance,
        totalCredit,
        totalDebit,
        txnCount: acctTxns.length,
      };
    });
  },

  transferBetweenAccounts: async (fromAccountId, toAccountId, amountPaisa, userId, description, date) => {
    const transferId = genId();
    const now = Date.now();
    const txnDate = date || todayISO();

    const fromAccount = await db.accounts.get(fromAccountId);
    const toAccount = await db.accounts.get(toAccountId);
    const fromName = fromAccount?.name || 'Unknown';
    const toName = toAccount?.name || 'Unknown';
    const desc = description || `Transfer: ${fromName} → ${toName}`;

    // Debit from source
    const debitTxn: Transaction = {
      id: genId(),
      userId,
      date: txnDate,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      isDeleted: false,
      partyName: toName,
      description: desc,
      category: 'Transfer',
      paymentMethod: 'Bank Transfer',
      referenceNumber: '',
      debitPaisa: amountPaisa,
      creditPaisa: 0,
      notes: `Transfer to ${toName}`,
      accountId: fromAccountId,
      transferId,
      syncStatus: 'pending',
    };

    // Credit to destination
    const creditTxn: Transaction = {
      id: genId(),
      userId,
      date: txnDate,
      createdAt: now,
      updatedAt: now + 1, // +1ms to ensure unique ordering
      deletedAt: null,
      isDeleted: false,
      partyName: fromName,
      description: desc,
      category: 'Transfer',
      paymentMethod: 'Bank Transfer',
      referenceNumber: '',
      debitPaisa: 0,
      creditPaisa: amountPaisa,
      notes: `Transfer from ${fromName}`,
      accountId: toAccountId,
      transferId,
      syncStatus: 'pending',
    };

    await db.transactions.bulkAdd([debitTxn, creditTxn]);
  },
}));
