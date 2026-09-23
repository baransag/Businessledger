// src/pages/PartyDetail.tsx
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/transactionStore';
import { calculateRunningBalances } from '../utils/balance';
import { formatPKR } from '../utils/money';
import { formatDisplayDate } from '../utils/dateUtils';
import { exportPartyPDF } from '../utils/pdfExport';
import TransactionForm from '../components/TransactionForm/TransactionForm';
import type { Transaction } from '../db/schema';
import toast from 'react-hot-toast';

const PartyDetail: React.FC = () => {
  const { partyName } = useParams<{ partyName: string }>();
  const { transactions, settings, softDeleteTransaction } = useTransactionStore();
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Transaction | null>(null);

  const name = decodeURIComponent(partyName || '');
  const openingBalance = settings?.openingBalancePaisa ?? 0;
  const active = useMemo(() => transactions.filter(t => !t.isDeleted), [transactions]);

  const partyTxns = useMemo(() =>
    active.filter(t => t.partyName === name &&
      (!dateFrom || t.date >= dateFrom) &&
      (!dateTo   || t.date <= dateTo)
    ),
    [active, name, dateFrom, dateTo]
  );

  // Running balance across all transactions first, then filter to party
  const allWithBalance = useMemo(() => calculateRunningBalances(active, openingBalance), [active, openingBalance]);
  const partyWithBalance = useMemo(() =>
    allWithBalance.filter(t => t.partyName === name &&
      (!dateFrom || t.date >= dateFrom) &&
      (!dateTo   || t.date <= dateTo)
    ),
    [allWithBalance, name, dateFrom, dateTo]
  );

  const totalCredit = partyTxns.reduce((s, t) => s + t.creditPaisa, 0);
  const totalDebit  = partyTxns.reduce((s, t) => s + t.debitPaisa, 0);
  const net = totalCredit - totalDebit;

  const handleExportPDF = async () => {
    try {
      await exportPartyPDF(name, partyWithBalance, { totalCredit, totalDebit, net }, settings);
      toast.success('Party statement exported as PDF.');
    } catch { toast.error('PDF export failed. Please try again.'); }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/parties')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <h1>{name}</h1>
            <p className="text-muted text-sm">Party Statement</p>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={handleExportPDF}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Export PDF
        </button>
      </div>

      {/* Summary */}
      <div className="stats-grid mb-6">
        <div className="stat-card stat-credit">
          <div className="stat-label">Total Credit</div>
          <div className="stat-value amount-credit">{formatPKR(totalCredit)}</div>
        </div>
        <div className="stat-card stat-debit">
          <div className="stat-label">Total Debit</div>
          <div className="stat-value amount-debit">{formatPKR(totalDebit)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net Balance</div>
          <div className={`stat-value ${net >= 0 ? 'amount-credit' : 'amount-debit'}`}>{formatPKR(net)}</div>
        </div>
      </div>

      {/* Date filters */}
      <div className="card mb-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Clear
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="card" style={{ padding: 0 }}>
        {partyWithBalance.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions in this range</h3>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Ref</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th className="text-right">Balance</th>
                  <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {partyWithBalance.map(t => (
                  <tr key={t.id}>
                    <td className="text-sm">{formatDisplayDate(t.date)}</td>
                    <td>{t.description}</td>
                    <td>{t.category ? <span className="badge badge-blue">{t.category}</span> : '—'}</td>
                    <td className="text-muted text-sm">{t.referenceNumber || '—'}</td>
                    <td className="text-right">{t.debitPaisa > 0 ? <span className="amount-debit">{formatPKR(t.debitPaisa)}</span> : '—'}</td>
                    <td className="text-right">{t.creditPaisa > 0 ? <span className="amount-credit">{formatPKR(t.creditPaisa)}</span> : '—'}</td>
                    <td className="text-right"><span className="amount-balance">{formatPKR(t.runningBalance)}</span></td>
                    <td>
                      <div className="row-actions" style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit transaction / Change account"
                          onClick={() => setEditTxn(t)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm text-danger"
                          title="Delete transaction"
                          onClick={() => setDeleteConfirm(t)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="font-semibold">Total</td>
                  <td className="text-right amount-debit">{formatPKR(totalDebit)}</td>
                  <td className="text-right amount-credit">{formatPKR(totalCredit)}</td>
                  <td className="text-right amount-balance">{partyWithBalance.length > 0 ? formatPKR(partyWithBalance[partyWithBalance.length-1].runningBalance) : '—'}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editTxn && (
        <TransactionForm
          onClose={() => setEditTxn(null)}
          editTransaction={editTxn}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Transaction?</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this transaction for <strong>{deleteConfirm.partyName}</strong>?</p>
              <p className="text-muted text-sm" style={{ marginTop: 8 }}>
                Amount: {formatPKR(deleteConfirm.creditPaisa || deleteConfirm.debitPaisa)} · Date: {formatDisplayDate(deleteConfirm.date)}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  await softDeleteTransaction(deleteConfirm.id);
                  setDeleteConfirm(null);
                  toast.success('Transaction deleted');
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyDetail;
