// src/pages/Export.tsx
import React, { useMemo, useState } from 'react';
import { useTransactionStore } from '../stores/transactionStore';
import { useAccountStore } from '../stores/accountStore';
import { calculateRunningBalances, calculateSummary } from '../utils/balance';
import { exportStatementPDF } from '../utils/pdfExport';
import { exportToExcel, exportToCSV } from '../utils/excelExport';
import { todayISO, startOfMonth, endOfMonth } from '../utils/dateUtils';
import { db } from '../db/db';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const Export: React.FC = () => {
  const { transactions, settings } = useTransactionStore();
  const { accounts } = useAccountStore();
  const { user } = useAuthStore();
  const userId = user?.id || 'local-user';
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [restoreFile, setRestoreFile]       = useState<File | null>(null);
  const [mergeMode, setMergeMode]           = useState<'replace' | 'merge'>('merge');

  const active = useMemo(() => {
    let txns = transactions.filter(t => !t.isDeleted);
    if (filterAccountId) txns = txns.filter(t => t.accountId === filterAccountId);
    return txns;
  }, [transactions, filterAccountId]);
  const openingBalance = settings?.openingBalancePaisa ?? 0;
  const allWithBalance = useMemo(() => calculateRunningBalances(active, openingBalance), [active, openingBalance]);
  const summary = useMemo(() => calculateSummary(active, openingBalance), [active, openingBalance]);

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return allWithBalance;
    return allWithBalance.filter(t =>
      (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo)
    );
  }, [allWithBalance, dateFrom, dateTo]);

  const filteredSummary = useMemo(() => {
    const periodTxns = active.filter(t => (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo));
    const before = active.filter(t => dateFrom && t.date < dateFrom);
    const periodOpening = openingBalance + before.reduce((s,t) => s + t.creditPaisa - t.debitPaisa, 0);
    return calculateSummary(periodTxns, periodOpening);
  }, [active, openingBalance, dateFrom, dateTo]);

  const doExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(format);
    try {
      const range = dateFrom || dateTo ? `${dateFrom || 'start'} to ${dateTo || 'now'}` : undefined;
      if (format === 'pdf') {
        await exportStatementPDF(filtered, {
          openingPaisa: filteredSummary.openingBalancePaisa,
          creditPaisa:  filteredSummary.totalCreditPaisa,
          debitPaisa:   filteredSummary.totalDebitPaisa,
          closingPaisa: filteredSummary.closingBalancePaisa,
        }, settings, range);
        toast.success('PDF exported.');
      } else if (format === 'excel') {
        exportToExcel(filtered);
        toast.success('Excel exported.');
      } else {
        exportToCSV(filtered);
        toast.success('CSV exported.');
      }
    } catch { toast.error('Export failed. Please try again.'); }
    finally { setExporting(null); }
  };

  // Backup
  const handleBackup = async () => {
    
    setExporting('backup');
    try {
      const [txns, cats, pms, sett] = await Promise.all([
        db.transactions.where('userId').equals(userId).toArray(),
        db.categories.where('userId').equals(userId).toArray(),
        db.paymentMethods.where('userId').equals(userId).toArray(),
        db.settings.get('singleton'),
      ]);
      const backup = { version: 1, exportedAt: new Date().toISOString(), transactions: txns, categories: cats, paymentMethods: pms, settings: sett };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `leadger-backup-${todayISO()}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Full backup downloaded.');
    } catch { toast.error('Backup failed.'); }
    finally { setExporting(null); }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setRestoreFile(f); setRestoreConfirm(true); }
  };

  const handleRestore = async () => {
    if (!restoreFile || !user) return;
    setExporting('restore');
    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);
      if (!backup.version || !backup.transactions) throw new Error('Invalid backup file.');

      if (mergeMode === 'replace') {
        await db.transactions.where('userId').equals(userId).delete();
        await db.categories.where('userId').equals(userId).delete();
        await db.paymentMethods.where('userId').equals(userId).delete();
      }

      const txns = backup.transactions.map((t: Record<string,unknown>) => ({ ...t, userId: userId, syncStatus: 'pending' }));
      await db.transactions.bulkPut(txns);
      if (backup.categories)    await db.categories.bulkPut(backup.categories.map((c: Record<string,unknown>) => ({ ...c, userId: userId })));
      if (backup.paymentMethods) await db.paymentMethods.bulkPut(backup.paymentMethods.map((p: Record<string,unknown>) => ({ ...p, userId: userId })));
      if (backup.settings)      await db.settings.put({ ...backup.settings, id: 'singleton', userId: userId });

      toast.success(`Restore complete. ${txns.length} transactions restored.`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.error('Restore failed. The backup file may be corrupted.');
    } finally { setExporting(null); setRestoreConfirm(false); setRestoreFile(null); }
  };

  const handleClearLocal = async () => {
    
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently remove all local financial data from this device.\n\nCloud records will NOT be deleted.\n\nType "DELETE" to confirm.'
    );
    if (!confirmed) return;
    const typed = window.prompt('Type DELETE to confirm:');
    if (typed !== 'DELETE') { toast.error('Cancelled — data not deleted.'); return; }
    await db.transactions.where('userId').equals(userId).delete();
    await db.categories.where('userId').equals(userId).delete();
    await db.paymentMethods.where('userId').equals(userId).delete();
    await db.settings.delete('singleton');
    toast.success('Local data cleared. Reload to start fresh.');
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header"><div><h1>Export & Backup</h1><p className="text-muted text-sm">Export statements and manage your data backup</p></div></div>

      {/* Date Filter */}
      <div className="card mb-6">
        <div className="card-header"><div className="card-title">Date Range Filter (optional)</div></div>
        <div className="flex gap-4 flex-wrap">
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label className="form-label">Account</label>
            <select
              className="form-select"
              value={filterAccountId}
              onChange={e => setFilterAccountId(e.target.value)}
            >
              <option value="">All Accounts</option>
              {accounts.filter(a => a.isActive).map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(startOfMonth()); setDateTo(endOfMonth()); }}>This Month</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); setFilterAccountId(''); }}>Clear All</button>
          </div>
        </div>
        <p className="text-muted text-sm mt-2">{filtered.length} transactions selected{filterAccountId ? ` (${accounts.find(a => a.id === filterAccountId)?.name})` : ''}</p>
      </div>

      {/* Export */}
      <div className="card mb-6">
        <div className="card-header"><div className="card-title">Export Statement</div></div>
        <div className="flex gap-3 flex-wrap">
          {[
            { fmt: 'pdf'   as const, label: '📄 Export PDF',   desc: 'Professional print-ready statement' },
            { fmt: 'excel' as const, label: '📊 Export Excel',  desc: 'Opens in Microsoft Excel / Google Sheets' },
            { fmt: 'csv'   as const, label: '📋 Export CSV',    desc: 'Universal spreadsheet format' },
          ].map(({ fmt, label, desc }) => (
            <button key={fmt} className="btn btn-ghost export-btn" onClick={() => doExport(fmt)} disabled={exporting !== null}>
              {exporting === fmt ? <span className="spinner" /> : null}
              <div style={{ textAlign: 'left' }}>
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-muted">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Backup */}
      <div className="card mb-6">
        <div className="card-header"><div className="card-title">Full Backup</div></div>
        <p className="text-muted text-sm mb-4">Downloads all your data as a JSON backup file including transactions, categories, payment methods, and settings.</p>
        <button className="btn btn-primary" onClick={handleBackup} disabled={exporting !== null}>
          {exporting === 'backup' ? <><span className="spinner" />Creating backup…</> : '💾 Download Full Backup'}
        </button>
      </div>

      {/* Restore */}
      <div className="card mb-6">
        <div className="card-header"><div className="card-title">Restore from Backup</div></div>
        <div className="alert alert-warning mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          Restoring will modify your current local records. Cloud records are not affected.
        </div>
        <div className="flex gap-4 items-center flex-wrap mb-4">
          <label className="form-label">Restore Mode:</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" value="merge" checked={mergeMode==='merge'} onChange={() => setMergeMode('merge')} /> Merge (add to existing)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" value="replace" checked={mergeMode==='replace'} onChange={() => setMergeMode('replace')} /> Replace (overwrite existing)
          </label>
        </div>
        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
          📁 Choose Backup File (.json)
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleRestoreFile} />
        </label>
      </div>

      {/* Clear Local Data */}
      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
        <div className="card-header"><div className="card-title" style={{ color: 'var(--clr-red)' }}>⚠️ Danger Zone</div></div>
        <p className="text-muted text-sm mb-4">Clear all local financial data from this device. Cloud data remains intact.</p>
        <button className="btn btn-danger" onClick={handleClearLocal}>Clear Local Data</button>
      </div>

      {/* Restore confirm modal */}
      {restoreConfirm && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header"><h3>Confirm Restore</h3></div>
            <div className="modal-body">
              <p>File: <strong>{restoreFile?.name}</strong></p>
              <p className="text-muted text-sm mt-2">Mode: <strong>{mergeMode === 'merge' ? 'Merge with existing' : 'Replace all local data'}</strong></p>
              <div className="alert alert-warning mt-4">This will modify your current local records.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setRestoreConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRestore} disabled={exporting !== null}>
                {exporting === 'restore' ? <><span className="spinner" />Restoring…</> : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.export-btn { flex-direction: row; align-items: flex-start; gap: 12px; padding: 14px 20px; min-width: 220px; }`}</style>
    </div>
  );
};

export default Export;
