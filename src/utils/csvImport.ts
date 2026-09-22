// src/utils/csvImport.ts
import Papa from 'papaparse';
import { rupeesToPaisa } from './money';
import { todayISO } from './dateUtils';

export interface ImportRow {
  id: string;
  date: string;
  partyName: string;
  description: string;
  category: string;
  paymentMethod: string;
  referenceNumber: string;
  debitPaisa: number;
  creditPaisa: number;
  notes: string;
  _raw: Record<string, string>;
  _errors: string[];
  _isDuplicate?: boolean;
}

function parseAmount(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n * 100); // to paisa
}

function normalizeDate(val: string): string {
  if (!val) return todayISO();
  // Try multiple formats
  const cleaned = val.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  // DD-MMM-YYYY
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return todayISO();
}

const COLUMN_ALIASES: Record<string, string[]> = {
  date:           ['date', 'transaction date', 'txn date', 'dt'],
  partyName:      ['party', 'party name', 'name', 'customer', 'vendor', 'account'],
  description:    ['description', 'narration', 'details', 'particulars', 'remarks'],
  category:       ['category', 'type', 'group'],
  paymentMethod:  ['payment method', 'method', 'mode', 'payment mode'],
  referenceNumber:['reference', 'ref', 'bill', 'invoice', 'voucher', 'ref #'],
  debitPaisa:     ['debit', 'dr', 'expense', 'withdrawal', 'paid'],
  creditPaisa:    ['credit', 'cr', 'income', 'deposit', 'received'],
  notes:          ['notes', 'remarks', 'comment'],
};

function findColumn(headers: string[], field: string): string | null {
  const aliases = COLUMN_ALIASES[field] || [field];
  for (const h of headers) {
    if (aliases.some(a => h.toLowerCase().includes(a))) return h;
  }
  return null;
}

export function parseCSV(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const headers = results.meta.fields || [];
        const colMap: Record<string, string | null> = {};
        Object.keys(COLUMN_ALIASES).forEach(f => { colMap[f] = findColumn(headers, f); });

        const rows: ImportRow[] = results.data.map((raw, i) => {
          const get = (field: string): string => (colMap[field] ? (raw[colMap[field]!] || '') : '');
          const errors: string[] = [];

          const dateStr = normalizeDate(get('date'));
          const debit  = parseAmount(get('debitPaisa'));
          const credit = parseAmount(get('creditPaisa'));

          if (!get('date')) errors.push('Date missing');
          if (debit === 0 && credit === 0) errors.push('No debit or credit amount');
          if (debit > 0 && credit > 0) errors.push('Both debit and credit are non-zero');

          return {
            id: `import-${Date.now()}-${i}`,
            date:            dateStr,
            partyName:       get('partyName'),
            description:     get('description'),
            category:        get('category'),
            paymentMethod:   get('paymentMethod'),
            referenceNumber: get('referenceNumber'),
            debitPaisa:      debit,
            creditPaisa:     credit,
            notes:           get('notes'),
            _raw:   raw,
            _errors: errors,
          };
        });

        resolve(rows);
      },
      error: (err: Error) => reject(new Error(err.message)),
    });
  });
}

export function parseExcel(file: File): Promise<ImportRow[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

      if (raw.length === 0) { resolve([]); return; }

      const headers = Object.keys(raw[0]);
      const colMap: Record<string, string | null> = {};
      Object.keys(COLUMN_ALIASES).forEach(f => { colMap[f] = findColumn(headers, f); });

      const rows: ImportRow[] = raw.map((row, i) => {
        const get = (field: string): string => (colMap[field] ? String(row[colMap[field]!] || '') : '');
        const errors: string[] = [];
        const debit  = parseAmount(get('debitPaisa'));
        const credit = parseAmount(get('creditPaisa'));
        if (debit === 0 && credit === 0) errors.push('No debit or credit amount');

        return {
          id: `import-${Date.now()}-${i}`,
          date:            normalizeDate(get('date')),
          partyName:       get('partyName'),
          description:     get('description'),
          category:        get('category'),
          paymentMethod:   get('paymentMethod'),
          referenceNumber: get('referenceNumber'),
          debitPaisa:      debit,
          creditPaisa:     credit,
          notes:           get('notes'),
          _raw: row,
          _errors: errors,
        };
      });
      resolve(rows);
    } catch (e) {
      reject(e);
    }
  });
}

export function detectDuplicates(importRows: ImportRow[], existingTxns: Array<{
  date: string; partyName: string; debitPaisa: number; creditPaisa: number; referenceNumber: string;
}>): ImportRow[] {
  return importRows.map(row => {
    const isDuplicate = existingTxns.some(e =>
      e.date === row.date &&
      e.partyName.toLowerCase() === row.partyName.toLowerCase() &&
      e.debitPaisa === row.debitPaisa &&
      e.creditPaisa === row.creditPaisa &&
      (row.referenceNumber ? e.referenceNumber === row.referenceNumber : true)
    );
    return { ...row, _isDuplicate: isDuplicate };
  });
}
