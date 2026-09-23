// src/pages/Reports.tsx
import React, { useMemo, useState } from 'react';
import { useTransactionStore } from '../stores/transactionStore';
import { useAccountStore } from '../stores/accountStore';
import { calculateSummary, calculateRunningBalances } from '../utils/balance';
import { formatPKR } from '../utils/money';
import { formatDisplayDate, todayISO, startOfMonth, endOfMonth, startOfWeek, startOfYear, dayjs } from '../utils/dateUtils';
import { exportStatementPDF } from '../utils/pdfExport';
import { exportToExcel, exportToCSV } from '../utils/excelExport';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import toast from 'react-hot-toast';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const Reports: React.FC = () => {
  const { transactions, settings } = useTransactionStore();
  const { accounts } = useAccountStore();
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [customFrom, setCustomFrom] = useState(startOfMonth());
  const [customTo,   setCustomTo]   = useState(todayISO());
  const [filterAccountId, setFilterAccountId] = useState('');

  const active = useMemo(() => {
    let txns = transactions.filter(t => !t.isDeleted);
    if (filterAccountId) txns = txns.filter(t => t.accountId === filterAccountId);
    return txns;
  }, [transactions, filterAccountId]);
  const openingBalance = settings?.openingBalancePaisa ?? 0;

  const { dateFrom, dateTo } = useMemo(() => {
    const today = todayISO();
    switch (reportType) {
      case 'daily':   return { dateFrom: today, dateTo: today };
      case 'weekly':  return { dateFrom: startOfWeek(), dateTo: today };
      case 'monthly': return { dateFrom: startOfMonth(), dateTo: endOfMonth() };
      case 'yearly':  return { dateFrom: startOfYear(), dateTo: today };
      case 'custom':  return { dateFrom: customFrom, dateTo: customTo };
    }
  }, [reportType, customFrom, customTo]);

  const periodTxns = useMemo(() =>
    active.filter(t => t.date >= dateFrom && t.date <= dateTo),
    [active, dateFrom, dateTo]
  );

  // Opening balance for period = total up to dateFrom
  const beforePeriod = useMemo(() =>
    active.filter(t => t.date < dateFrom),
    [active, dateFrom]
  );
  const periodOpeningBalance = openingBalance +
    beforePeriod.reduce((s, t) => s + t.creditPaisa - t.debitPaisa, 0);

  const summary = useMemo(() =>
    calculateSummary(periodTxns, periodOpeningBalance),
    [periodTxns, periodOpeningBalance]
  );

  // Reconciliation check
  const isReconciled = summary.openingBalancePaisa + summary.totalCreditPaisa - summary.totalDebitPaisa === summary.closingBalancePaisa;

  // Chart — group by category
  const categoryChart = useMemo(() => {
    const map = new Map<string, { credit: number; debit: number }>();
    periodTxns.forEach(t => {
      const cat = t.category || 'Uncategorized';
      const ex = map.get(cat) || { credit: 0, debit: 0 };
      map.set(cat, { credit: ex.credit + t.creditPaisa / 100, debit: ex.debit + t.debitPaisa / 100 });
    });
    return Array.from(map.entries())
      .map(([name, vals]) => ({ name, ...vals }))
      .sort((a, b) => (b.credit + b.debit) - (a.credit + a.debit))
      .slice(0, 10);
  }, [periodTxns]);

  // Running balance for export
  const withBalance = useMemo(() => {
    const allWithBalance = calculateRunningBalances(active, openingBalance);
    return allWithBalance.filter(t => t.date >= dateFrom && t.date <= dateTo);
  }, [active, openingBalance, dateFrom, dateTo]);

  const handleExportPDF = async () => {
    try {
      await exportStatementPDF(
        withBalance,
        { openingPaisa: summary.openingBalancePaisa, creditPaisa: summary.totalCreditPaisa, debitPaisa: summary.totalDebitPaisa, closingPaisa: summary.closingBalancePaisa },
        settings,
        `${formatDisplayDate(dateFrom)} – ${formatDisplayDate(dateTo)}`,
        `report-${dateFrom}-to-${dateTo}.pdf`
      );
      toast.success('Report exported as PDF.');
    } catch { toast.error('PDF export failed.'); }
  };
  const handleExportExcel = () => { exportToExcel(withBalance, `report-${dateFrom}-to-${dateTo}.xlsx`); toast.success('Report exported as Excel.'); };
  const handleExportCSV   = () => { exportToCSV(withBalance,   `report-${dateFrom}-to-${dateTo}.csv`);  toast.success('Report exported as CSV.'); };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="text-muted text-sm">Financial analysis and statements</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost btn-sm" onClick={handleExportPDF}>PDF</button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportExcel}>Excel</button>
          <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>CSV</button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="tabs mb-6">
        {(['daily','weekly','monthly','yearly','custom'] as ReportType[]).map(t => (
          <button key={t} className={`tab-btn ${reportType === t ? 'active' : ''}`}
            onClick={() => setReportType(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Account Filter */}
      <div className="card mb-6" style={{ padding: '12px 16px' }}>
        <div className="flex gap-4 items-center flex-wrap">
          <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Filter by Account</label>
          <select
            className="form-select"
            value={filterAccountId}
            onChange={e => setFilterAccountId(e.target.value)}
            style={{ maxWidth: 260 }}
          >
            <option value="">All Accounts</option>
            {accounts.filter(a => a.isActive).map(a => (
              <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
            ))}
          </select>
          {filterAccountId && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilterAccountId('')}>Clear</button>
          )}
        </div>
      </div>

      {/* Custom Date Picker */}
      {reportType === 'custom' && (
        <div className="card mb-6">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">From</label>
              <input type="date" className="form-input" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
              <label className="form-label">To</label>
              <input type="date" className="form-input" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Period Label */}
      <div className="alert alert-info mb-6" style={{ justifyContent: 'space-between' }}>
        <span>Period: <strong>{formatDisplayDate(dateFrom)} — {formatDisplayDate(dateTo)}</strong></span>
        <span className="text-sm">{periodTxns.length} transactions</span>
      </div>

      {/* Reconciliation warning */}
      {!isReconciled && (
        <div className="alert alert-warning mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Accounting reconciliation warning: Calculated balance does not match expected balance.
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid mb-6">
        <div className="stat-card">
          <div className="stat-label">Opening Balance</div>
          <div className="stat-value amount-balance">{formatPKR(summary.openingBalancePaisa)}</div>
          <div className="stat-sub">Start of period</div>
        </div>
        <div className="stat-card stat-credit">
          <div className="stat-label">Total Credit</div>
          <div className="stat-value amount-credit">{formatPKR(summary.totalCreditPaisa)}</div>
          <div className="stat-sub">Money received</div>
        </div>
        <div className="stat-card stat-debit">
          <div className="stat-label">Total Debit</div>
          <div className="stat-value amount-debit">{formatPKR(summary.totalDebitPaisa)}</div>
          <div className="stat-sub">Money paid</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Closing Balance</div>
          <div className={`stat-value ${summary.closingBalancePaisa >= 0 ? 'amount-credit' : 'amount-debit'}`}>
            {formatPKR(summary.closingBalancePaisa)}
          </div>
          <div className="stat-sub">End of period</div>
        </div>
      </div>

      {/* Category Chart */}
      {categoryChart.length > 0 && (
        <div className="card mb-6">
          <div className="card-header"><div className="card-title">By Category</div></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryChart} margin={{ top: 4, right: 4, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--clr-text-muted)', fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fill: 'var(--clr-text-muted)', fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: 8 }}
                formatter={(val) => [`Rs. ${Number(val).toLocaleString()}`, undefined]} />
              <Bar dataKey="credit" name="Credit" fill="var(--clr-green)" radius={[4,4,0,0]} />
              <Bar dataKey="debit"  name="Debit"  fill="var(--clr-red)"   radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transaction Table */}
      {periodTxns.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <div className="card-title">Transactions in Period</div>
          </div>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Party</th><th>Description</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {withBalance.map(t => (
                  <tr key={t.id}>
                    <td className="text-sm">{formatDisplayDate(t.date)}</td>
                    <td className="font-semibold">{t.partyName}</td>
                    <td className="text-muted text-sm">{t.description}</td>
                    <td className="text-right">{t.debitPaisa > 0 ? <span className="amount-debit">{formatPKR(t.debitPaisa)}</span> : '—'}</td>
                    <td className="text-right">{t.creditPaisa > 0 ? <span className="amount-credit">{formatPKR(t.creditPaisa)}</span> : '—'}</td>
                    <td className="text-right"><span className="amount-balance">{formatPKR(t.runningBalance)}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="font-bold">TOTAL</td>
                  <td className="text-right amount-debit font-bold">{formatPKR(summary.totalDebitPaisa)}</td>
                  <td className="text-right amount-credit font-bold">{formatPKR(summary.totalCreditPaisa)}</td>
                  <td className="text-right amount-balance font-bold">{formatPKR(summary.closingBalancePaisa)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {periodTxns.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <h3>No transactions in this period</h3>
        </div>
      )}
    </div>
  );
};

export default Reports;
