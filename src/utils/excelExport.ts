// src/utils/excelExport.ts
// Excel/CSV export using SheetJS

import * as XLSX from 'xlsx';
import { formatDisplayDate } from './dateUtils';
import { paisaToRupees } from './money';
import type { RunningBalanceRow } from './balance';
import { todayISO } from './dateUtils';

export function exportToExcel(rows: RunningBalanceRow[], filename?: string): void {
  const data = rows.map(r => ({
    'Date':           formatDisplayDate(r.date),
    'Party':          r.partyName,
    'Description':    r.description,
    'Category':       r.category || '',
    'Payment Method': r.paymentMethod || '',
    'Reference':      r.referenceNumber || '',
    'Debit (Rs.)':    r.debitPaisa  > 0 ? paisaToRupees(r.debitPaisa)  : '',
    'Credit (Rs.)':   r.creditPaisa > 0 ? paisaToRupees(r.creditPaisa) : '',
    'Balance (Rs.)':  paisaToRupees(r.runningBalance),
    'Notes':          r.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 14 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  XLSX.writeFile(wb, filename || `transactions-${todayISO()}.xlsx`);
}

export function exportToCSV(rows: RunningBalanceRow[], filename?: string): void {
  const data = rows.map(r => ({
    'Date':           formatDisplayDate(r.date),
    'Party':          r.partyName,
    'Description':    r.description,
    'Category':       r.category || '',
    'Payment Method': r.paymentMethod || '',
    'Reference':      r.referenceNumber || '',
    'Debit (Rs.)':    r.debitPaisa  > 0 ? paisaToRupees(r.debitPaisa)  : '',
    'Credit (Rs.)':   r.creditPaisa > 0 ? paisaToRupees(r.creditPaisa) : '',
    'Balance (Rs.)':  paisaToRupees(r.runningBalance),
    'Notes':          r.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `transactions-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
