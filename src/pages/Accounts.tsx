// src/pages/Accounts.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountStore, AccountWithBalance } from '../stores/accountStore';
import { useTransactionStore } from '../stores/transactionStore';
import { useAuthStore } from '../stores/authStore';
import { formatPKR } from '../utils/money';
import { BankLogo } from '../components/BankLogo/BankLogo';
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

  const [filter, setFilter] = useState<'all' | 'bank' | 'wallet' | 'cash'>('all');

  useEffect(() => {
    loadAccounts(userId);
  }, [userId]);

  const accountsWithBalance = useMemo(
    () => getAccountsWithBalance(transactions),
    [accounts, transactions]
  );

  const activeAccounts = useMemo(() => accountsWithBalance.filter(a => a.isActive), [accountsWithBalance]);
  const bankAccounts = useMemo(() => activeAccounts.filter(a => a.type === 'bank'), [activeAccounts]);
  const walletAccounts = useMemo(() => activeAccounts.filter(a => a.type === 'wallet'), [activeAccounts]);
  const cashAccounts = useMemo(() => activeAccounts.filter(a => a.type === 'cash'), [activeAccounts]);

  const filteredAccounts = useMemo(() => {
    if (filter === 'all') return accountsWithBalance;
    return accountsWithBalance.filter(a => a.type === filter);
  }, [accountsWithBalance, filter]);

  const totalBalance = accountsWithBalance.reduce((s, a) => s + a.balance, 0);
  const totalIn = accountsWithBalance.reduce((s, a) => s + a.totalCredit, 0);
  const totalOut = accountsWithBalance.reduce((s, a) => s + a.totalDebit, 0);
  const activeCount = activeAccounts.length;

  return (
    <div className="accounts-page">
      {/* Header */}
      <div className="accounts-header">
        <div>
          <h1>Accounts</h1>
          <p className="text-muted text-sm">Manage your bank accounts, digital wallets & physical cash</p>
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
          <div className="accounts-total-label">Combined Liquid Balance</div>
          <div className={`accounts-total-amount ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
            {formatPKR(totalBalance)}
          </div>
          <div className="text-xs text-muted mt-1">Cash + Bank Accounts + Digital Wallets</div>
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
            <div className="stat-val">{activeCount} Accounts</div>
            <div className="stat-lbl">Active Total</div>
          </div>
        </div>
      </div>

      {/* Type Filter */}
      <div className="accounts-type-toggle" style={{ marginBottom: 20 }}>
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          🔍 All ({activeAccounts.length})
        </button>
        <button
          className={filter === 'bank' ? 'active' : ''}
          onClick={() => setFilter('bank')}
        >
          🏦 Banks ({bankAccounts.length})
        </button>
        <button
          className={filter === 'wallet' ? 'active' : ''}
          onClick={() => setFilter('wallet')}
        >
          📱 Wallets ({walletAccounts.length})
        </button>
        <button
          className={filter === 'cash' ? 'active' : ''}
          onClick={() => setFilter('cash')}
        >
          💵 Cash ({cashAccounts.length})
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="stats-grid">
        {filteredAccounts.map((account, index) => (
          <AccountCard
            key={account.id}
            account={account}
            index={index}
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

// ─── Account Card Component (Nova Glass) ─────────────────────────────

interface AccountCardProps {
  account: AccountWithBalance;
  index: number;
  onClick: () => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, index, onClick }) => {
  const total = account.totalCredit + account.totalDebit;
  const inPercent = total > 0 ? Math.round((account.totalCredit / total) * 100) : 50;

  return (
    <div
      className={`stat-card account-card-nova ${!account.isActive ? 'inactive' : ''}`}
      onClick={onClick}
      style={{ '--acct-color': account.color } as React.CSSProperties}
      title={`View ${account.name} Ledger`}
    >
      <div
        className="account-card-top-bar"
        style={{ background: account.color }}
      />
      <div className="stat-card-header">
        <div className="flex items-center gap-2">
          <BankLogo accountName={account.name} type={account.type} size={36} />
          <span className="stat-num-badge">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <span className={`stat-pill-tag ${account.type === 'cash' ? 'tag-cash' : account.type === 'wallet' ? 'tag-records' : 'tag-credit'}`}>
          ● {account.type === 'cash' ? 'CASH' : account.type === 'wallet' ? 'WALLET' : 'BANK'}
        </span>
      </div>

      <div className="account-card-name-title">{account.name}</div>
      <div className="stat-label">CURRENT BALANCE</div>
      <div className={`stat-value ${account.balance >= 0 ? 'amount-credit' : 'amount-debit'}`}>
        {formatPKR(account.balance)}
      </div>

      <div className="stat-sub account-stat-sub">
        <span style={{ color: 'var(--clr-green)' }}>
          ↓ {account.type === 'cash' ? 'Cash In' : 'In'}: {formatPKR(account.totalCredit)}
        </span>
        <span style={{ color: 'var(--clr-red)' }}>
          ↑ {account.type === 'cash' ? 'Cash Out' : 'Out'}: {formatPKR(account.totalDebit)}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: '0.785rem', color: 'var(--clr-text-muted)' }}>
        <span>Transactions: <strong style={{ color: 'var(--clr-text-primary)' }}>{account.txnCount}</strong></span>
        <span style={{ fontWeight: 600, color: 'var(--clr-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Open Account →
        </span>
      </div>

      <div className="stat-glass-bar" style={{ marginTop: 8 }}>
        <div
          className="stat-glass-fill"
          style={{ width: `${inPercent}%`, background: account.color || 'var(--pal-teal)' }}
        />
      </div>
    </div>
  );
};

export default Accounts;
