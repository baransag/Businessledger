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
  balance: number;            // opening + credits - debits (paisa)
  totalCredit: number;        // total inflow paisa (all credits)
  totalDebit: number;         // total outflow paisa (all debits)
  txnCount: number;           // number of transactions
  transfersInPaisa: number;   // incoming transfers
  transfersOutPaisa: number;  // outgoing transfers
  businessCreditPaisa: number;// normal business credits (excluding transfers)
  businessDebitPaisa: number; // normal business debits (excluding transfers)
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
      let accounts = await db.accounts.where('userId').equals(userId).toArray();

      // Seed defaults if no accounts exist yet
      if (accounts.length === 0) {
        await get().seedDefaultAccounts(userId);
        return;
      }

      // Safe additive migration for existing accounts:
      let changed = false;
      const now = Date.now();

      // 1. Rename 'Meezan Bank' to 'Meezan Bank — Main' if present
      const meezanOld = accounts.find(a => a.name === 'Meezan Bank');
      if (meezanOld) {
        await db.accounts.update(meezanOld.id, {
          name: 'Meezan Bank — Main',
          updatedAt: now,
          syncStatus: 'pending',
        });
        meezanOld.name = 'Meezan Bank — Main';
        changed = true;
      }

      // 2. Ensure 'Meezan Bank — Main' exists if neither old nor new was found
      const hasMeezanMain = accounts.some(a => a.name === 'Meezan Bank — Main' || a.name === 'Meezan Bank');
      if (!hasMeezanMain) {
        const meezanMainPreset = PRESET_ACCOUNTS.find(p => p.name === 'Meezan Bank — Main')!;
        const newMain: Account = {
          id: genId(),
          userId,
          name: meezanMainPreset.name,
          type: meezanMainPreset.type,
          icon: meezanMainPreset.icon,
          color: meezanMainPreset.color,
          openingBalancePaisa: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        };
        await db.accounts.add(newMain);
        accounts.push(newMain);
        changed = true;
      }

      // 3. Ensure 'Meezan Bank — Muhammad Asif' exists
      const hasMeezanAsif = accounts.some(a => a.name === 'Meezan Bank — Muhammad Asif');
      if (!hasMeezanAsif) {
        const asifPreset = PRESET_ACCOUNTS.find(p => p.name === 'Meezan Bank — Muhammad Asif')!;
        const newAsif: Account = {
          id: genId(),
          userId,
          name: asifPreset.name,
          type: asifPreset.type,
          icon: asifPreset.icon,
          color: asifPreset.color,
          openingBalancePaisa: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        };
        await db.accounts.add(newAsif);
        accounts.push(newAsif);
        changed = true;
      }

      // 4. Ensure 'Office Cash' exists
      const hasOfficeCash = accounts.some(a => a.name === 'Office Cash');
      if (!hasOfficeCash) {
        const cashPreset = PRESET_ACCOUNTS.find(p => p.name === 'Office Cash')!;
        const newCash: Account = {
          id: genId(),
          userId,
          name: cashPreset.name,
          type: 'cash',
          icon: cashPreset.icon,
          color: cashPreset.color,
          openingBalancePaisa: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        };
        await db.accounts.add(newCash);
        accounts.push(newCash);
        changed = true;
      }

      if (changed) {
        accounts = await db.accounts.where('userId').equals(userId).toArray();
      }

      // Consistent ordering: Banks first, then Wallets, then Cash
      const orderMap: Record<string, number> = {};
      PRESET_ACCOUNTS.forEach((p, idx) => { orderMap[p.name] = idx; });
      accounts.sort((a, b) => {
        const ordA = orderMap[a.name] ?? 999;
        const ordB = orderMap[b.name] ?? 999;
        return ordA - ordB;
      });

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
      icon: data.icon || (data.type === 'cash' ? '💵' : data.type === 'wallet' ? '📱' : '🏦'),
      color: data.color || (data.type === 'cash' ? '#0F766E' : '#4A90D9'),
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
      
      let totalCredit = 0;
      let totalDebit = 0;
      let transfersInPaisa = 0;
      let transfersOutPaisa = 0;
      let businessCreditPaisa = 0;
      let businessDebitPaisa = 0;

      acctTxns.forEach(t => {
        const isTransfer = Boolean(t.transferId || t.category === 'Transfer');
        if (t.creditPaisa > 0) {
          totalCredit += t.creditPaisa;
          if (isTransfer) {
            transfersInPaisa += t.creditPaisa;
          } else {
            businessCreditPaisa += t.creditPaisa;
          }
        }
        if (t.debitPaisa > 0) {
          totalDebit += t.debitPaisa;
          if (isTransfer) {
            transfersOutPaisa += t.debitPaisa;
          } else {
            businessDebitPaisa += t.debitPaisa;
          }
        }
      });

      const balance = account.openingBalancePaisa + totalCredit - totalDebit;

      return {
        ...account,
        balance,
        totalCredit,
        totalDebit,
        txnCount: acctTxns.length,
        transfersInPaisa,
        transfersOutPaisa,
        businessCreditPaisa,
        businessDebitPaisa,
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
    const pMethod = (fromAccount?.type === 'cash' || toAccount?.type === 'cash')
      ? 'Cash'
      : (fromAccount?.type === 'wallet' || toAccount?.type === 'wallet')
        ? 'Online'
        : 'Bank Transfer';

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
      paymentMethod: pMethod,
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
      paymentMethod: pMethod,
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
