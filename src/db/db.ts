// src/db/db.ts
// Dexie.js database instance

import Dexie, { Table } from 'dexie';
import type { Transaction, AppSettings, Category, PaymentMethod } from './schema';

export class LeadgerDB extends Dexie {
  transactions!: Table<Transaction, string>;
  settings!: Table<AppSettings, string>;
  categories!: Table<Category, string>;
  paymentMethods!: Table<PaymentMethod, string>;

  constructor() {
    super('LeadgerDB');

    this.version(1).stores({
      transactions: 'id, userId, date, createdAt, updatedAt, isDeleted, syncStatus, partyName, category, paymentMethod',
      settings:     'id, userId',
      categories:   'id, userId, name',
      paymentMethods: 'id, userId, name',
    });
  }
}

export const db = new LeadgerDB();
