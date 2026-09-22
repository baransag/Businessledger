// src/stores/transactionStore.ts
import { create } from 'zustand';
import { db } from '../db/db';
import type { Transaction, AppSettings, Category, PaymentMethod } from '../db/schema';
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from '../db/schema';
import { rupeesToPaisa } from '../utils/money';
import { todayISO } from '../utils/dateUtils';
// Use crypto.randomUUID for ID generation
function genId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface TransactionFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  party: string;
  category: string;
  paymentMethod: string;
  type: 'all' | 'credit' | 'debit';
  amountMin: string;
  amountMax: string;
}

interface TransactionState {
  transactions: Transaction[];
  settings: AppSettings | null;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  filters: TransactionFilters;
  isLoading: boolean;
  error: string | null;

  // Computed
  filteredTransactions: Transaction[];

  loadAll: (userId: string) => Promise<void>;
  addTransaction: (data: Partial<Transaction>, userId: string) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  softDeleteTransaction: (id: string) => Promise<void>;
  restoreTransaction: (id: string) => Promise<void>;
  hardDeleteTransaction: (id: string) => Promise<void>;

  loadSettings: (userId: string) => Promise<void>;
  saveSettings: (data: Partial<AppSettings>, userId: string) => Promise<void>;

  addCategory: (name: string, userId: string) => Promise<void>;
  addPaymentMethod: (name: string, userId: string) => Promise<void>;

  setFilters: (f: Partial<TransactionFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
}

const defaultFilters: TransactionFilters = {
  search: '', dateFrom: '', dateTo: '',
  party: '', category: '', paymentMethod: '',
  type: 'all', amountMin: '', amountMax: '',
};

function applyFiltersToList(txns: Transaction[], filters: TransactionFilters): Transaction[] {
  return txns.filter(t => {
    if (t.isDeleted) return false;
    const q = filters.search.toLowerCase();
    if (q && !(
      t.partyName.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.referenceNumber.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.paymentMethod.toLowerCase().includes(q) ||
      t.notes.toLowerCase().includes(q)
    )) return false;
    if (filters.dateFrom && t.date < filters.dateFrom) return false;
    if (filters.dateTo && t.date > filters.dateTo) return false;
    if (filters.party && !t.partyName.toLowerCase().includes(filters.party.toLowerCase())) return false;
    if (filters.category && t.category !== filters.category) return false;
    if (filters.paymentMethod && t.paymentMethod !== filters.paymentMethod) return false;
    if (filters.type === 'credit' && t.creditPaisa === 0) return false;
    if (filters.type === 'debit' && t.debitPaisa === 0) return false;
    if (filters.amountMin) {
      const min = rupeesToPaisa(parseFloat(filters.amountMin));
      const amt = Math.max(t.creditPaisa, t.debitPaisa);
      if (amt < min) return false;
    }
    if (filters.amountMax) {
      const max = rupeesToPaisa(parseFloat(filters.amountMax));
      const amt = Math.max(t.creditPaisa, t.debitPaisa);
      if (amt > max) return false;
    }
    return true;
  });
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  settings: null,
  categories: [],
  paymentMethods: [],
  filters: defaultFilters,
  isLoading: false,
  error: null,
  filteredTransactions: [],

  loadAll: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [txns, cats, pms] = await Promise.all([
        db.transactions.where('userId').equals(userId).sortBy('date'),
        db.categories.where('userId').equals(userId).toArray(),
        db.paymentMethods.where('userId').equals(userId).toArray(),
      ]);
      const { filters } = get();
      set({
        transactions: txns,
        filteredTransactions: applyFiltersToList(txns, filters),
        categories: cats,
        paymentMethods: pms,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, error: 'Unable to load records. Please try again.' });
    }
  },

  addTransaction: async (data, userId) => {
    const now = Date.now();
    const txn: Transaction = {
      id: genId(),
      userId,
      date: data.date || todayISO(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      isDeleted: false,
      partyName: data.partyName || '',
      description: data.description || '',
      category: data.category || '',
      paymentMethod: data.paymentMethod || '',
      referenceNumber: data.referenceNumber || '',
      debitPaisa: data.debitPaisa || 0,
      creditPaisa: data.creditPaisa || 0,
      notes: data.notes || '',
      syncStatus: 'pending',
    };
    await db.transactions.add(txn);
    await get().loadAll(userId);
  },

  updateTransaction: async (id, data) => {
    const txn = await db.transactions.get(id);
    if (!txn) return;
    await db.transactions.update(id, { ...data, updatedAt: Date.now(), syncStatus: 'pending' });
    await get().loadAll(txn.userId);
  },

  softDeleteTransaction: async (id) => {
    const txn = await db.transactions.get(id);
    if (!txn) return;
    await db.transactions.update(id, {
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending',
    });
    await get().loadAll(txn.userId);
  },

  restoreTransaction: async (id) => {
    const txn = await db.transactions.get(id);
    if (!txn) return;
    await db.transactions.update(id, {
      isDeleted: false,
      deletedAt: null,
      updatedAt: Date.now(),
      syncStatus: 'pending',
    });
    await get().loadAll(txn.userId);
  },

  hardDeleteTransaction: async (id) => {
    const txn = await db.transactions.get(id);
    if (!txn) return;
    await db.transactions.delete(id);
    await get().loadAll(txn.userId);
  },

  loadSettings: async (userId) => {
    let settings = await db.settings.get('singleton');
    if (!settings) {
      settings = {
        id: 'singleton',
        userId,
        openingBalancePaisa: 0,
        openingBalanceDate: todayISO(),
        openingBalanceNote: '',
        businessTitle: 'Business Ledger',
        currencySymbol: 'Rs.',
        dateFormat: 'DD-MMM-YYYY',
        pdfHeader: 'Business Statement',
        duroodBannerVisible: true,
        lastSyncAt: 0,
        updatedAt: Date.now(),
        syncStatus: 'pending',
      };
      await db.settings.add(settings);

      // Seed default categories and payment methods
      const now = Date.now();
      const cats: Category[] = DEFAULT_CATEGORIES.map(name => ({
        id: genId(), userId, name, isDefault: true, createdAt: now,
      }));
      const pms: PaymentMethod[] = DEFAULT_PAYMENT_METHODS.map(name => ({
        id: genId(), userId, name, isDefault: true, createdAt: now,
      }));
      await db.categories.bulkAdd(cats);
      await db.paymentMethods.bulkAdd(pms);
    }
    set({ settings });
  },

  saveSettings: async (data, userId) => {
    const existing = await db.settings.get('singleton');
    if (existing) {
      await db.settings.update('singleton', { ...data, updatedAt: Date.now(), syncStatus: 'pending' });
    } else {
      await db.settings.add({ id: 'singleton', userId, ...data, updatedAt: Date.now(), syncStatus: 'pending' } as AppSettings);
    }
    const updated = await db.settings.get('singleton');
    set({ settings: updated || null });
  },

  addCategory: async (name, userId) => {
    const existing = await db.categories.where('userId').equals(userId).toArray();
    if (existing.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
    await db.categories.add({ id: genId(), userId, name, isDefault: false, createdAt: Date.now() });
    const cats = await db.categories.where('userId').equals(userId).toArray();
    set({ categories: cats });
  },

  addPaymentMethod: async (name, userId) => {
    const existing = await db.paymentMethods.where('userId').equals(userId).toArray();
    if (existing.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
    await db.paymentMethods.add({ id: genId(), userId, name, isDefault: false, createdAt: Date.now() });
    const pms = await db.paymentMethods.where('userId').equals(userId).toArray();
    set({ paymentMethods: pms });
  },

  setFilters: (f) => {
    const filters = { ...get().filters, ...f };
    const filtered = applyFiltersToList(get().transactions, filters);
    set({ filters, filteredTransactions: filtered });
  },

  clearFilters: () => {
    const filtered = applyFiltersToList(get().transactions, defaultFilters);
    set({ filters: defaultFilters, filteredTransactions: filtered });
  },

  applyFilters: () => {
    const filtered = applyFiltersToList(get().transactions, get().filters);
    set({ filteredTransactions: filtered });
  },
}));
