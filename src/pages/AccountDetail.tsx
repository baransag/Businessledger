// src/pages/AccountDetail.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccountStore } from '../stores/accountStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useAuthStore } from '../stores/authStore';
import { formatPKR, paisaToRupees, rupeesToPaisa } from '../utils/money';
import { formatDisplayDate } from '../utils/dateUtils';
import { BankLogo } from '../components/BankLogo/BankLogo';
import TransactionForm from '../components/TransactionForm/TransactionForm';
import type { Transaction } from '../db/schema';
import toast from 'react-hot-toast';
import './AccountDetail.css';

interface AccountDetailProps {
  onAddTransaction?: (type: 'credit' | 'debit') => void;
}

const AccountDetail: React.FC<AccountDetailProps> = ({ onAddTransaction }) => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { accounts, updateAccount } = useAccountStore();
  const { transactions, softDeleteTransaction } = useTransactionStore();
  const userId = user?.id || 'local-user';

  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Transaction | null>(null);

  const account = useMemo(
    () => accounts.find(a => a.id === accountId),
    [accounts, accountId]
  );

  const accountTxns = useMemo(
    () => transactions
      .filter(t => !t.isDeleted && t.accountId === accountId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [transactions, accountId]
  );

  const totalCredit = accountTxns.reduce((s, t) => s + t.creditPaisa, 0);
  const totalDebit = accountTxns.reduce((s, t) => s + t.debitPaisa, 0);
  const balance = (account?.openingBalancePaisa || 0) + totalCredit - totalDebit;

  // Opening balance editor
  const [editingOB, setEditingOB] = useState(false);
  const [obInput, setObInput] = useState('');

  useEffect(() => {
    if (account) {
      setObInput(String(paisaToRupees(account.openingBalancePaisa)));
    }
  }, [account]);

  const handleSaveOB = async () => {
    if (!account) return;
    const val = parseFloat(obInput);
    if (isNaN(val) || val < 0) {
      toast.error('Enter a valid positive amount');
      return;
    }
    await updateAccount(account.id, { openingBalancePaisa: rupeesToPaisa(val) });
    setEditingOB(false);
    toast.success('Opening balance updated');
  };

  if (!account) {
    return (
      <div className="account-detail">
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <h3>Account not found</h3>
          <p className="text-muted">This account may have been removed.</p>
          <button className="btn btn-primary" onClick={() => navigate('/accounts')}>
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-detail">
      {/* Back button */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/accounts')}
        style={{ marginBottom: 16 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        All Accounts
      </button>

      {/* Hero Card */}
      <div className="account-hero" style={{ background: `linear-gradient(135deg, ${account.color}, ${account.color}CC)` }}>
        <div className="account-hero-top">
          <div className="account-hero-icon" style={{ background: 'transparent', padding: 0 }}>
            <BankLogo accountName={account.name} type={account.type} size={48} />
          </div>
          <span className="account-hero-badge">
            {account.type === 'wallet' ? '📱 Digital Wallet' : '🏦 Bank Account'}
          </span>
        </div>
        <div className="account-hero-name">{account.name}</div>
        <div className="account-hero-balance-label">Current Balance</div>
        <div className="account-hero-balance">{formatPKR(balance)}</div>

        <div className="account-hero-stats">
          <div className="account-hero-stat">
            <div className="label">Money In</div>
            <div className="value">{formatPKR(totalCredit)}</div>
          </div>
          <div className="account-hero-stat">
            <div className="label">Money Out</div>
            <div className="value">{formatPKR(totalDebit)}</div>
          </div>
          <div className="account-hero-stat">
            <div className="label">Transactions</div>
            <div className="value">{accountTxns.length}</div>
          </div>
          <div className="account-hero-stat">
            <div className="label">Opening Balance</div>
            <div className="value">{formatPKR(account.openingBalancePaisa)}</div>
          </div>
        </div>
      </div>

      {/* Opening Balance Editor */}
      <div className="opening-balance-card">
        <div style={{ flex: 1 }}>
          <div className="text-sm font-semibold" style={{ marginBottom: 2 }}>Opening Balance</div>
          <div className="text-muted text-sm">Set the starting balance for this account</div>
        </div>
        {editingOB ? (
          <>
            <div className="amount-input-wrap" style={{ maxWidth: 160 }}>
              <span className="amount-prefix">Rs.</span>
              <input
                type="number"
                className="form-input amount-input"
                value={obInput}
                onChange={e => setObInput(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleSaveOB}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingOB(false)}>Cancel</button>
          </>
        ) : (
          <>
            <span className="font-bold">{formatPKR(account.openingBalancePaisa)}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingOB(true)}>Edit</button>
          </>
        )}
      </div>

      {/* Quick Actions */}
      {onAddTransaction && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button className="btn btn-success btn-sm" onClick={() => onAddTransaction('credit')}>
            + Credit to {account.name}
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onAddTransaction('debit')}>
            − Debit from {account.name}
          </button>
        </div>
      )}

      {/* Transactions Table */}
      <div className="card">
        <div className="account-txn-header">
          <div className="card-title">Account Transactions</div>
          <span className="text-muted text-sm">{accountTxns.length} records</span>
        </div>

        {accountTxns.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <p className="text-muted">No transactions recorded for this account yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Party</th>
                  <th>Description</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accountTxns.map(t => (
                  <tr key={t.id}>
                    <td className="text-sm text-muted">{formatDisplayDate(t.date)}</td>
                    <td className="font-semibold">{t.partyName}</td>
                    <td className="text-muted text-sm">{t.description}</td>
                    <td className="text-right">
                      {t.debitPaisa > 0
                        ? <span className="amount-debit">{formatPKR(t.debitPaisa)}</span>
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    <td className="text-right">
                      {t.creditPaisa > 0
                        ? <span className="amount-credit">{formatPKR(t.creditPaisa)}</span>
                        : <span className="text-muted">—</span>
                      }
                    </td>
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

export default AccountDetail;
