// src/utils/pdfExport.ts
// Professional PDF export using jsPDF + jspdf-autotable

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDate, todayISO } from './dateUtils';
import { formatPKR, paisaToRupees } from './money';
import type { RunningBalanceRow } from './balance';
import type { AppSettings } from '../db/schema';

function setupHeader(doc: jsPDF, title: string, settings: AppSettings | null, dateRange?: string) {
  const businessTitle = settings?.businessTitle || 'Business Ledger';
  const pdfHeader = settings?.pdfHeader || 'Financial Statement';

  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(businessTitle, 14, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(136, 150, 176);
  doc.text(pdfHeader, 14, 20);
  if (dateRange) {
    doc.text(dateRange, 210 - 14, 20, { align: 'right' });
  }
  doc.setTextColor(136, 150, 176);
  doc.setFontSize(8);
  doc.text(`Generated: ${formatDisplayDate(todayISO())}`, 210 - 14, 12, { align: 'right' });
}

function addSummaryBox(doc: jsPDF, startY: number, summary: {
  openingPaisa: number; creditPaisa: number; debitPaisa: number; closingPaisa: number;
}) {
  const y = startY + 6;
  doc.setFillColor(26, 32, 51);
  doc.roundedRect(14, y, 182, 22, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(136, 150, 176);
  const cols = [
    { label: 'Opening Balance', val: formatPKR(summary.openingPaisa), x: 30 },
    { label: 'Total Credit',    val: formatPKR(summary.creditPaisa),  x: 80 },
    { label: 'Total Debit',     val: formatPKR(summary.debitPaisa),   x: 130 },
    { label: 'Closing Balance', val: formatPKR(summary.closingPaisa), x: 180 },
  ];
  cols.forEach(c => {
    doc.setTextColor(136, 150, 176);
    doc.text(c.label, c.x, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    if (c.label === 'Total Credit')    doc.setTextColor(34, 197, 94);
    else if (c.label === 'Total Debit') doc.setTextColor(239, 68, 68);
    else                                doc.setTextColor(79, 142, 247);
    doc.text(c.val, c.x, y + 17, { align: 'center' });
    doc.setFontSize(8);
  });
  return y + 28;
}

export async function exportStatementPDF(
  rows: RunningBalanceRow[],
  summary: { openingPaisa: number; creditPaisa: number; debitPaisa: number; closingPaisa: number },
  settings: AppSettings | null,
  dateRange?: string,
  filename?: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  setupHeader(doc, 'Financial Statement', settings, dateRange);
  const afterSummary = addSummaryBox(doc, 30, summary);

  autoTable(doc, {
    startY: afterSummary,
    head: [['Date', 'Party', 'Description', 'Category', 'Method', 'Ref', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)']],
    body: rows.map(r => [
      formatDisplayDate(r.date),
      r.partyName,
      r.description,
      r.category || '—',
      r.paymentMethod || '—',
      r.referenceNumber || '—',
      r.debitPaisa  > 0 ? paisaToRupees(r.debitPaisa).toLocaleString()  : '—',
      r.creditPaisa > 0 ? paisaToRupees(r.creditPaisa).toLocaleString() : '—',
      paisaToRupees(r.runningBalance).toLocaleString(),
    ]),
    foot: [[
      '', '', '', '', '', 'TOTAL',
      paisaToRupees(summary.debitPaisa).toLocaleString(),
      paisaToRupees(summary.creditPaisa).toLocaleString(),
      paisaToRupees(summary.closingPaisa).toLocaleString(),
    ]],
    headStyles: { fillColor: [22, 27, 34], textColor: [136, 150, 176], fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fillColor: [26, 32, 51], textColor: [232, 237, 245], fontSize: 7 },
    alternateRowStyles: { fillColor: [28, 34, 48] },
    footStyles: { fillColor: [13, 17, 23], textColor: [79, 142, 247], fontSize: 8, fontStyle: 'bold' },
    columnStyles: {
      6: { halign: 'right', textColor: [239, 68, 68] },
      7: { halign: 'right', textColor: [34, 197, 94] },
      8: { halign: 'right', textColor: [79, 142, 247] },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(filename || `statement-${todayISO()}.pdf`);
}

export async function exportPartyPDF(
  partyName: string,
  rows: RunningBalanceRow[],
  totals: { totalCredit: number; totalDebit: number; net: number },
  settings: AppSettings | null
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  setupHeader(doc, `Party Statement — ${partyName}`, settings);

  doc.setTextColor(232, 237, 245);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Party: ${partyName}`, 14, 36);

  const afterSummary = addSummaryBox(doc, 38, {
    openingPaisa: 0,
    creditPaisa: totals.totalCredit,
    debitPaisa:  totals.totalDebit,
    closingPaisa: totals.net,
  });

  autoTable(doc, {
    startY: afterSummary,
    head: [['Date', 'Description', 'Category', 'Ref', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)']],
    body: rows.map(r => [
      formatDisplayDate(r.date),
      r.description,
      r.category || '—',
      r.referenceNumber || '—',
      r.debitPaisa  > 0 ? paisaToRupees(r.debitPaisa).toLocaleString()  : '—',
      r.creditPaisa > 0 ? paisaToRupees(r.creditPaisa).toLocaleString() : '—',
      paisaToRupees(r.runningBalance).toLocaleString(),
    ]),
    foot: [[
      '', '', '', 'TOTAL',
      paisaToRupees(totals.totalDebit).toLocaleString(),
      paisaToRupees(totals.totalCredit).toLocaleString(),
      paisaToRupees(totals.net).toLocaleString(),
    ]],
    headStyles: { fillColor: [22, 27, 34], textColor: [136, 150, 176], fontSize: 8 },
    bodyStyles: { fillColor: [26, 32, 51], textColor: [232, 237, 245], fontSize: 8 },
    footStyles: { fillColor: [13, 17, 23], textColor: [79, 142, 247], fontSize: 9, fontStyle: 'bold' },
    columnStyles: {
      4: { halign: 'right', textColor: [239, 68, 68] },
      5: { halign: 'right', textColor: [34, 197, 94] },
      6: { halign: 'right', textColor: [79, 142, 247] },
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`party-${partyName.replace(/\s+/g, '-')}-${todayISO()}.pdf`);
}
