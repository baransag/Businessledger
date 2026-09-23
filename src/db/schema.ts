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
  accountId: string;   // FK → Account.id, '' = unassigned
  transferId: string;  // Links paired transfer transactions
  syncStatus: 'pending' | 'synced' | 'conflict';
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'bank' | 'wallet';
  icon: string;
  color: string;
  openingBalancePaisa: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'synced';
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

// ─── Preset Accounts (12 Pakistani banks + wallets) ───────────────────

export interface PresetAccount {
  name: string;
  type: 'bank' | 'wallet';
  icon: string;
  color: string;
}

export const PRESET_ACCOUNTS: PresetAccount[] = [
  { name: 'Meezan Bank',              type: 'bank',   icon: '🏦', color: '#1B6B3A' },
  { name: 'HBL',                      type: 'bank',   icon: '🏛️', color: '#006B3F' },
  { name: 'MCB',                      type: 'bank',   icon: '🏦', color: '#D4A843' },
  { name: 'MCIB',                     type: 'bank',   icon: '🏦', color: '#2E5090' },
  { name: 'NBP',                      type: 'bank',   icon: '🏛️', color: '#0A4D8C' },
  { name: 'Bank Alfalah',             type: 'bank',   icon: '🏦', color: '#C8102E' },
  { name: 'Faisal Bank',              type: 'bank',   icon: '🏦', color: '#006747' },
  { name: 'UBL',                      type: 'bank',   icon: '🏛️', color: '#004B87' },
  { name: 'Bank of Punjab (BOP)',     type: 'bank',   icon: '🏦', color: '#8B1A1A' },
  { name: 'Habib Metropolitan Bank',  type: 'bank',   icon: '🏛️', color: '#1A3C6E' },
  { name: 'EasyPaisa',                type: 'wallet', icon: '📱', color: '#3AAA35' },
  { name: 'JazzCash',                 type: 'wallet', icon: '📲', color: '#E21E26' },
];
