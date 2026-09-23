// src/db/db.ts
// Dexie.js database instance

import Dexie, { Table } from 'dexie';
import type { Transaction, AppSettings, Category, PaymentMethod, Account } from './schema';

export class LeadgerDB extends Dexie {
  transactions!: Table<Transaction, string>;
  settings!: Table<AppSettings, string>;
  categories!: Table<Category, string>;
  paymentMethods!: Table<PaymentMethod, string>;
  accounts!: Table<Account, string>;

  constructor() {
    super('LeadgerDB');

    // v1 — original schema
    this.version(1).stores({
      transactions: 'id, userId, date, createdAt, updatedAt, isDeleted, syncStatus, partyName, category, paymentMethod',
      settings:     'id, userId',
      categories:   'id, userId, name',
      paymentMethods: 'id, userId, name',
    });

    // v2 — add accounts table + accountId index on transactions
    this.version(2).stores({
      transactions: 'id, userId, date, createdAt, updatedAt, isDeleted, syncStatus, partyName, category, paymentMethod, accountId',
      settings:     'id, userId',
      categories:   'id, userId, name',
      paymentMethods: 'id, userId, name',
      accounts:     'id, userId, name, type, isActive',
    }).upgrade(tx => {
      // Migrate existing transactions: add accountId and transferId
      return tx.table('transactions').toCollection().modify(txn => {
        if (txn.accountId === undefined) txn.accountId = '';
        if (txn.transferId === undefined) txn.transferId = '';
      });
    });
  }
}

export const db = new LeadgerDB();

