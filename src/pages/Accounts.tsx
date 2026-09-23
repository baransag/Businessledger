// src/pages/Accounts.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountStore, AccountWithBalance } from '../stores/accountStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useAuthStore } from '../stores/authStore';
import { formatPKR } from '../utils/money';
import './Accounts.css';

interface AccountsProps {
  onOpenTransfer?: () => void;
}

const Accounts: React.FC<AccountsProps> = ({ onOpenTransfer }) => {
  const { user } = useAuthStore();
  const { accounts, loadAccounts } = useAccountStore();
  const { transactions } = useTransactionStore();
  const getAccountsWithBalance = useAccountStore(s => s.getAccountsWithBalance);
  const navigate = useNavigate();
  const userId = user?.id || 'local-user';

  const [filter, setFilter] = useState<'all' | 'bank' | 'wallet'>('all');

  useEffect(() => {
    loadAccounts(userId);
  }, [userId]);

  const accountsWithBalance = useMemo(
    () => getAccountsWithBalance(transactions),
    [accounts, transactions]
  );

  const filteredAccounts = useMemo(() => {
    if (filter === 'all') return accountsWithBalance;
    return accountsWithBalance.filter(a => a.type === filter);
  }, [accountsWithBalance, filter]);

  const totalBalance = accountsWithBalance.reduce((s, a) => s + a.balance, 0);
  const totalIn = accountsWithBalance.reduce((s, a) => s + a.totalCredit, 0);
  const totalOut = accountsWithBalance.reduce((s, a) => s + a.totalDebit, 0);
  const activeCount = accountsWithBalance.filter(a => a.isActive).length;

  return (
    <div className="accounts-page">
      {/* Header */}
      <div className="accounts-header">
        <div>
          <h1>Accounts</h1>
          <p className="text-muted text-sm">Manage your bank accounts & digital wallets</p>
        </div>
        <div className="accounts-actions">
          {onOpenTransfer && (
            <button className="btn btn-primary" onClick={onOpenTransfer} id="accounts-transfer-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              Transfer
            </button>
          )}
        </div>
      </div>

      {/* Total Balance Banner */}
      <div className="accounts-total-banner">
        <div>
          <div className="accounts-total-label">Combined Balance</div>
          <div className={`accounts-total-amount ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
            {formatPKR(totalBalance)}
          </div>
        </div>
        <div className="accounts-total-stats">
          <div className="accounts-total-stat">
            <div className="stat-val amount-credit">{formatPKR(totalIn)}</div>
            <div className="stat-lbl">Total In</div>
          </div>
          <div className="accounts-total-stat">
            <div className="stat-val amount-debit">{formatPKR(totalOut)}</div>
            <div className="stat-lbl">Total Out</div>
          </div>
          <div className="accounts-total-stat">
            <div className="stat-val">{activeCount}</div>
            <div className="stat-lbl">Active Accounts</div>
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div className="accounts-type-toggle" style={{ marginBottom: 20 }}>
        {(['all', 'bank', 'wallet'] as const).map(t => (
          <button
            key={t}
            className={filter === t ? 'active' : ''}
            onClick={() => setFilter(t)}
          >
            {t === 'all' ? '🔍 All' : t === 'bank' ? '🏦 Banks' : '📱 Wallets'}
          </button>
        ))}
      </div>

      {/* Account Cards Grid */}
      <div className="accounts-grid">
        {filteredAccounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onClick={() => navigate(`/accounts/${account.id}`)}
          />
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="empty-state" style={{ padding: '40px 0' }}>
          <h3>No accounts found</h3>
          <p className="text-muted">
            {filter !== 'all'
              ? `No ${filter} accounts. Try switching the filter.`
              : 'Accounts will appear here once loaded.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Account Card Component ──────────────────────────────────────────

interface AccountCardProps {
  account: AccountWithBalance;
  onClick: () => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onClick }) => {
  const total = account.totalCredit + account.totalDebit;
  const inPercent = total > 0 ? Math.round((account.totalCredit / total) * 100) : 50;

  return (
    <div
      className={`account-card ${!account.isActive ? 'inactive' : ''}`}
      onClick={onClick}
      style={{ '--acct-color': account.color } as React.CSSProperties}
    >
      {/* Color accent bar */}
      <style>{`
        .account-card[style*="${account.color}"]::before {
          background: ${account.color};
        }
      `}</style>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: account.color, borderRadius: '16px 16px 0 0' }} />

      <div className="account-card-top">
        <div
          className="account-icon-wrap"
          style={{ background: `${account.color}18` }}
        >
          {account.icon}
        </div>
        <span className={`account-type-badge ${account.type}`}>
          {account.type === 'wallet' ? '📱 Wallet' : '🏦 Bank'}
        </span>
      </div>

      <div className="account-card-name">{account.name}</div>
      <div className={`account-card-balance ${account.balance >= 0 ? 'amount-credit' : 'amount-debit'}`}>
        {formatPKR(account.balance)}
      </div>

      <div className="account-card-row">
        <span className="label">Money In</span>
        <span className="value credit">{formatPKR(account.totalCredit)}</span>
      </div>
      <div className="account-card-row">
        <span className="label">Money Out</span>
        <span className="value debit">{formatPKR(account.totalDebit)}</span>
      </div>
      <div className="account-card-row">
        <span className="label">Transactions</span>
        <span className="value">{account.txnCount}</span>
      </div>

      <div className="account-card-bar">
        <div
          className="fill-in"
          style={{ width: `${inPercent}%`, background: account.color }}
        />
        <div
          className="fill-out"
          style={{ width: `${100 - inPercent}%` }}
        />
      </div>
    </div>
  );
};

export default Accounts;
