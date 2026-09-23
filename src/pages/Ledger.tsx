// src/pages/Ledger.tsx
import React, { useState, useMemo } from 'react';
import { useTransactionStore } from '../stores/transactionStore';
import { calculateRunningBalances } from '../utils/balance';
import { formatPKR } from '../utils/money';
import { formatDisplayDate } from '../utils/dateUtils';
import type { Transaction } from '../db/schema';
import { useAccountStore } from '../stores/accountStore';
import { BankLogo } from '../components/BankLogo/BankLogo';
import TransactionForm from '../components/TransactionForm/TransactionForm';
import toast from 'react-hot-toast';
import './Ledger.css';

const PAGE_SIZE = 50;

const Ledger: React.FC = () => {
  const { transactions, settings, filters, setFilters, clearFilters, filteredTransactions,
    softDeleteTransaction, categories, paymentMethods } = useTransactionStore();
  const { accounts } = useAccountStore();
  const [accountFilter, setAccountFilter] = useState('');
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<Transaction | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const openingBalance = settings?.openingBalancePaisa ?? 0;
  const active = useMemo(() => transactions.filter(t => !t.isDeleted), [transactions]);
  const deleted = useMemo(() => transactions.filter(t => t.isDeleted), [transactions]);

  const withBalance = useMemo(() =>
    calculateRunningBalances(active, openingBalance),
    [active, openingBalance]
  );

  // Apply filters on top of running balance rows
  const filtered = useMemo(() => {
    return withBalance.filter(t => {
      const q = filters.search.toLowerCase();
      if (q && !(
        t.partyName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.referenceNumber.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q)
      )) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo   && t.date > filters.dateTo)   return false;
      if (filters.party && !t.partyName.toLowerCase().includes(filters.party.toLowerCase())) return false;
      if (filters.category && t.category !== filters.category) return false;
      if (filters.paymentMethod && t.paymentMethod !== filters.paymentMethod) return false;
      if (accountFilter && t.accountId !== accountFilter) return false;
      if (filters.type === 'credit' && t.creditPaisa === 0) return false;
      if (filters.type === 'debit'  && t.debitPaisa === 0)  return false;
      return true;
    });
  }, [withBalance, filters, accountFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await softDeleteTransaction(deleteConfirm.id);
    toast.success('Transaction moved to Deleted Records.');
    setDeleteConfirm(null);
  };

  const totals = useMemo(() => ({
    credit: filtered.reduce((s, t) => s + t.creditPaisa, 0),
    debit:  filtered.reduce((s, t) => s + t.debitPaisa, 0),
  }), [filtered]);

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <h1>Transaction Ledger</h1>
          <p className="text-muted text-sm">{active.length} total transactions</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button className="btn btn-primary" onClick={() => { setEditTxn(null); setShowForm(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="filters-grid">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              type="search"
              className="form-input"
              placeholder="Party, description, reference…"
              value={filters.search}
              onChange={e => { setFilters({ search: e.target.value }); setPage(1); }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={filters.dateFrom}
              onChange={e => { setFilters({ dateFrom: e.target.value }); setPage(1); }} />
          </div>
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={filters.dateTo}
              onChange={e => { setFilters({ dateTo: e.target.value }); setPage(1); }} />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={filters.category}
              onChange={e => { setFilters({ category: e.target.value }); setPage(1); }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-select" value={filters.paymentMethod}
              onChange={e => { setFilters({ paymentMethod: e.target.value }); setPage(1); }}>
              <option value="">All Methods</option>
              {paymentMethods.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Account</label>
            <select className="form-select" value={accountFilter}
              onChange={e => { setAccountFilter(e.target.value); setPage(1); }}>
              <option value="">All Accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={filters.type}
              onChange={e => { setFilters({ type: e.target.value as 'all'|'credit'|'debit' }); setPage(1); }}>
              <option value="all">All</option>
              <option value="credit">Credit Only</option>
              <option value="debit">Debit Only</option>
            </select>
          </div>
        </div>
        <div className="filters-footer">
          <span className="text-muted text-sm">{filtered.length} results</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { clearFilters(); setAccountFilter(''); setPage(1); }}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="ledger-summary mb-4">
        <span className="text-muted text-sm">Filtered Totals:</span>
        <span>Credit: <strong className="amount-credit">{formatPKR(totals.credit)}</strong></span>
        <span>Debit: <strong className="amount-debit">{formatPKR(totals.debit)}</strong></span>
        <span>Net: <strong className={totals.credit - totals.debit >= 0 ? 'amount-credit' : 'amount-debit'}>
          {formatPKR(totals.credit - totals.debit)}
        </strong></span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {paged.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <h3>No transactions found</h3>
            <p>{active.length === 0 ? 'Your records will appear here.' : 'Try adjusting your filters.'}</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Party</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th>Account</th>
                  <th>Ref</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th className="text-right">Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(t => (
                  <tr key={t.id}>
                    <td className="text-sm">{formatDisplayDate(t.date)}</td>
                    <td className="font-semibold">{t.partyName}</td>
                    <td className="text-muted text-sm">{t.description}</td>
                    <td>{t.category ? <span className="badge badge-blue">{t.category}</span> : <span className="text-muted">—</span>}</td>
                    <td className="text-sm text-muted">{t.paymentMethod || '—'}</td>
                    <td>
                      {t.accountId ? (
                        (() => {
                          const acc = accounts.find(a => a.id === t.accountId);
                          if (!acc) return <span className="text-muted">—</span>;
                          return (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600 }}>
                              <BankLogo accountName={acc.name} type={acc.type} size={18} />
                              <span>{acc.name}</span>
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-sm text-muted">{t.referenceNumber || '—'}</td>
                    <td className="text-right">{t.debitPaisa > 0 ? <span className="amount-debit">{formatPKR(t.debitPaisa)}</span> : <span className="text-muted">—</span>}</td>
                    <td className="text-right">{t.creditPaisa > 0 ? <span className="amount-credit">{formatPKR(t.creditPaisa)}</span> : <span className="text-muted">—</span>}</td>
                    <td className="text-right"><span className="amount-balance">{formatPKR(t.runningBalance)}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit"
                          onClick={() => { setEditTxn(t); setShowForm(true); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm text-danger" title="Delete"
                          onClick={() => setDeleteConfirm(t)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7} className="font-semibold">Page Total</td>
                  <td className="text-right amount-debit">{formatPKR(paged.reduce((s,t) => s+t.debitPaisa, 0))}</td>
                  <td className="text-right amount-credit">{formatPKR(paged.reduce((s,t) => s+t.creditPaisa, 0))}</td>
                  <td className="text-right amount-balance">{paged.length > 0 ? formatPKR(paged[paged.length - 1].runningBalance) : '—'}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination mt-4 justify-end">
          <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
          <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i;
            return p <= totalPages ? (
              <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ) : null;
          })}
          <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      )}

      {/* Deleted Records */}
      {deleted.length > 0 && (
        <div className="mt-8">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleted(v => !v)}>
            {showDeleted ? 'Hide' : 'Show'} Deleted Records ({deleted.length})
          </button>
          {showDeleted && (
            <div className="card mt-4" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
              <div className="card-header"><div className="card-title" style={{ color: 'var(--clr-red)' }}>Recently Deleted</div></div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Party</th><th>Description</th><th className="text-right">Amount</th><th>Restore</th></tr>
                  </thead>
                  <tbody>
                    {deleted.map(t => (
                      <tr key={t.id} style={{ opacity: 0.6 }}>
                        <td>{formatDisplayDate(t.date)}</td>
                        <td>{t.partyName}</td>
                        <td>{t.description}</td>
                        <td className="text-right">
                          {t.creditPaisa > 0 ? <span className="amount-credit">{formatPKR(t.creditPaisa)}</span>
                            : <span className="amount-debit">{formatPKR(t.debitPaisa)}</span>}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => { useTransactionStore.getState().restoreTransaction(t.id); toast.success('Restored.'); }}>
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <TransactionForm
          onClose={() => { setShowForm(false); setEditTxn(null); }}
          editTransaction={editTxn}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h3>Delete Transaction?</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this transaction?</p>
              <p className="text-muted text-sm mt-2">
                <strong>{deleteConfirm.partyName}</strong> — {deleteConfirm.description}
                <br />
                {deleteConfirm.creditPaisa > 0 ? formatPKR(deleteConfirm.creditPaisa) + ' credit' : formatPKR(deleteConfirm.debitPaisa) + ' debit'}
              </p>
              <div className="alert alert-warning mt-4">
                The record can be restored from Deleted Records.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;
