// src/db/schema.ts
// Dexie.js database schema definitions

export interface Transaction {
  id: string;
  userId: string; // Supabase auth.uid()
  date: string;   // ISO YYYY-MM-DD for correct sorting
  createdAt: number; // Unix ms
  updatedAt: number; // Unix ms
  deletedAt: number | null;
  isDeleted: boolean;
  partyName: string;
  description: string;
  category: string;
  paymentMethod: string;
  referenceNumber: string;
  debitPaisa: number;  // integer paisa × 100, 0 if credit
  creditPaisa: number; // integer paisa × 100, 0 if debit
  notes: string;
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface AppSettings {
  id: string; // Always 'singleton'
  userId: string;
  openingBalancePaisa: number;
  openingBalanceDate: string;
  openingBalanceNote: string;
  businessTitle: string;
  currencySymbol: string;
  dateFormat: string;
  pdfHeader: string;
  duroodBannerVisible: boolean;
  lastSyncAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced';
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: number;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: number;
}

export const DEFAULT_CATEGORIES = [
  'Office', 'Salary', 'Purchase', 'Printing', 'Transport',
  'Utilities', 'Advance', 'Loan', 'Cash', 'Bank', 'Other',
];

export const DEFAULT_PAYMENT_METHODS = [
  'Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Online', 'Cheque', 'Other',
];
