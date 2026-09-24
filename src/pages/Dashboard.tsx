import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/transactionStore';
import { useAccountStore } from '../stores/accountStore';
import { useAuthStore } from '../stores/authStore';
import { BankLogo } from '../components/BankLogo/BankLogo';
import { calculateSummary, calculateRunningBalances } from '../utils/balance';
import { formatPKR } from '../utils/money';
import { formatDisplayDate, todayISO, startOfMonth } from '../utils/dateUtils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './Dashboard.css';

interface DashboardProps { onAddTransaction: (type?: 'credit' | 'debit') => void; }

const Dashboard: React.FC<DashboardProps> = ({ onAddTransaction }) => {
  const { transactions, settings, isLoading } = useTransactionStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const active = useMemo(() => transactions.filter(t => !t.isDeleted), [transactions]);
  const openingBalance = settings?.openingBalancePaisa ?? 0;

  // Accounts overview
  const [accountFilter, setAccountFilter] = useState<'all' | 'bank' | 'wallet' | 'cash'>('all');
  const { accounts } = useAccountStore();
  const getAccountsWithBalance = useAccountStore(s => s.getAccountsWithBalance);
  const accountsWithBalance = useMemo(
    () => getAccountsWithBalance(transactions),
    [accounts, transactions]
  );
  
  const activeAccounts = useMemo(() => accountsWithBalance.filter(a => a.isActive), [accountsWithBalance]);
  const bankAccounts = useMemo(() => activeAccounts.filter(a => a.type === 'bank'), [activeAccounts]);
  const walletAccounts = useMemo(() => activeAccounts.filter(a => a.type === 'wallet'), [activeAccounts]);
  const cashAccounts = useMemo(() => activeAccounts.filter(a => a.type === 'cash'), [activeAccounts]);

  const displayedAccounts = useMemo(() => {
    if (accountFilter === 'all') return activeAccounts;
    return activeAccounts.filter(a => a.type === accountFilter);
  }, [activeAccounts, accountFilter]);

  // Office Cash account & balance
  const officeCashAccount = useMemo(
    () => activeAccounts.find(a => a.type === 'cash' || a.name.toLowerCase().includes('office cash')),
    [activeAccounts]
  );
  const officeCashBalance = officeCashAccount?.balance ?? 0;

  // Banks combined balance
  const totalBankBalance = useMemo(
    () => bankAccounts.reduce((s, a) => s + a.balance, 0),
    [bankAccounts]
  );

  // Wallets combined balance
  const totalWalletBalance = useMemo(
    () => walletAccounts.reduce((s, a) => s + a.balance, 0),
    [walletAccounts]
  );

  // Total Available = Cash + Banks + Wallets
  const totalAvailableBalance = officeCashBalance + totalBankBalance + totalWalletBalance;

  // Normal business movement (EXCLUDING internal transfers)
  const isTransfer = (t: typeof transactions[0]) => Boolean(t.transferId || t.category === 'Transfer');
  const businessTxns = useMemo(() => active.filter(t => !isTransfer(t)), [active]);
  const totalMoneyIn = useMemo(() => businessTxns.reduce((s, t) => s + t.creditPaisa, 0), [businessTxns]);
  const totalMoneyOut = useMemo(() => businessTxns.reduce((s, t) => s + t.debitPaisa, 0), [businessTxns]);
  const netBusinessMovement = totalMoneyIn - totalMoneyOut;

  const summary = useMemo(() => calculateSummary(active, openingBalance), [active, openingBalance]);

  const today = todayISO();
  const monthStart = startOfMonth();

  const todayTxns = useMemo(() => active.filter(t => t.date === today), [active, today]);
  const monthTxns = useMemo(() => active.filter(t => t.date >= monthStart), [active, monthStart]);

  const todayCredit = todayTxns.reduce((s, t) => s + t.creditPaisa, 0);
  const todayDebit  = todayTxns.reduce((s, t) => s + t.debitPaisa, 0);
  const monthCredit = monthTxns.reduce((s, t) => s + t.creditPaisa, 0);
  const monthDebit  = monthTxns.reduce((s, t) => s + t.debitPaisa, 0);

  // Recent 10 transactions with running balance
  const withBalance = useMemo(() => calculateRunningBalances(active, openingBalance), [active, openingBalance]);
  const recent = useMemo(() => [...withBalance].reverse().slice(0, 10), [withBalance]);

  // Chart data — last 30 days
  const chartData = useMemo(() => {
    const map: Record<string, { credit: number; debit: number }> = {};
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 29);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    active.filter(t => t.date >= cutoffStr).forEach(t => {
      if (!map[t.date]) map[t.date] = { credit: 0, debit: 0 };
      map[t.date].credit += t.creditPaisa / 100;
      map[t.date].debit  += t.debitPaisa  / 100;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => ({
      date: formatDisplayDate(date),
      Credit: vals.credit,
      Debit:  vals.debit,
    }));
  }, [active]);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner spinner-lg" />
        <p>Loading your records…</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted text-sm">Welcome back — {settings?.businessTitle || 'Business Ledger'}</p>
        </div>
        <div className="dashboard-header-actions">
          <button className="btn btn-success" onClick={() => onAddTransaction('credit')} id="dash-add-credit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Credit
          </button>
          <button className="btn btn-danger" onClick={() => onAddTransaction('debit')} id="dash-add-debit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Debit
          </button>
        </div>
      </div>

      {/* Current Balance — Hero Card */}
      <div className="balance-hero">
        <div className="hero-top-badge">
          <span className="hero-status-dot" />
          <span>FINANCIAL OVERVIEW · LIVE</span>
        </div>
        <div className="balance-hero-label">CURRENT BALANCE</div>
        <div className={`balance-hero-amount ${summary.closingBalancePaisa >= 0 ? 'positive' : 'negative'}`}>
          {formatPKR(summary.closingBalancePaisa)}
        </div>
        <div className="balance-hero-sub">
          Opening: {formatPKR(openingBalance)}
          {settings?.openingBalanceDate && ` · since ${formatDisplayDate(settings.openingBalanceDate)}`}
        </div>
      </div>

      {/* Stats Grid — Nova Glass Cards */}
      <div className="stats-grid mt-6">
        {/* Card 01 — Total Credit */}
        <div className="stat-card stat-credit">
          <div className="stat-card-header">
            <span className="stat-num-badge">01</span>
            <span className="stat-pill-tag tag-credit">● INFLOW</span>
          </div>
          <div className="stat-label">Total Credit</div>
          <div className="stat-value amount-credit">{formatPKR(summary.totalCreditPaisa)}</div>
          <div className="stat-sub">
            <span>{active.filter(t => t.creditPaisa > 0).length} transactions</span>
          </div>
          <div className="stat-glass-bar">
            <div
              className="stat-glass-fill fill-credit"
              style={{ width: `${summary.totalCreditPaisa + summary.totalDebitPaisa > 0 ? Math.round((summary.totalCreditPaisa / (summary.totalCreditPaisa + summary.totalDebitPaisa)) * 100) : 50}%` }}
            />
          </div>
        </div>

        {/* Card 02 — Total Debit */}
        <div className="stat-card stat-debit">
          <div className="stat-card-header">
            <span className="stat-num-badge">02</span>
            <span className="stat-pill-tag tag-debit">● OUTFLOW</span>
          </div>
          <div className="stat-label">Total Debit</div>
          <div className="stat-value amount-debit">{formatPKR(summary.totalDebitPaisa)}</div>
          <div className="stat-sub">
            <span>{active.filter(t => t.debitPaisa > 0).length} transactions</span>
          </div>
          <div className="stat-glass-bar">
            <div
              className="stat-glass-fill fill-debit"
              style={{ width: `${summary.totalCreditPaisa + summary.totalDebitPaisa > 0 ? Math.round((summary.totalDebitPaisa / (summary.totalCreditPaisa + summary.totalDebitPaisa)) * 100) : 50}%` }}
            />
          </div>
        </div>

        {/* Card 03 — Net Movement */}
        <div className="stat-card stat-net">
          <div className="stat-card-header">
            <span className="stat-num-badge">03</span>
            <span className="stat-pill-tag tag-net">● NET POSITION</span>
          </div>
          <div className="stat-label">Net Movement</div>
          <div className={`stat-value ${summary.netMovementPaisa >= 0 ? 'amount-credit' : 'amount-debit'}`}>
            {summary.netMovementPaisa >= 0 ? '+' : ''}{formatPKR(summary.netMovementPaisa)}
          </div>
          <div className="stat-sub">Credit − Debit difference</div>
          <div className="stat-glass-bar">
            <div
              className="stat-glass-fill fill-sky"
              style={{ width: summary.netMovementPaisa >= 0 ? '75%' : '35%' }}
            />
          </div>
        </div>

        {/* Card 04 — Total Records */}
        <div className="stat-card stat-records">
          <div className="stat-card-header">
            <span className="stat-num-badge">04</span>
            <span className="stat-pill-tag tag-records">● ALL RECORDS</span>
          </div>
          <div className="stat-label">Total Transactions</div>
          <div className="stat-value">{active.length}</div>
          <div className="stat-sub">Active ledger entries</div>
          <div className="stat-glass-bar">
            <div className="stat-glass-fill fill-sage" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* ─── MONEY POSITION (Physical Cash, Banks, Wallets, Available) ─ */}
      <div className="section-header-wrap">
        <div className="section-headline">
          <span>MONEY POSITION</span>
        </div>
        <p className="section-subheadline">
          Real-time physical cash, bank deposits & digital wallet reserves
        </p>
      </div>

      <div className="money-position-grid">
        {/* Card 1: Office Cash */}
        <div
          className="money-position-card pos-cash"
          onClick={() => officeCashAccount && navigate(`/accounts/${officeCashAccount.id}`)}
          style={{ cursor: officeCashAccount ? 'pointer' : 'default' }}
          title={officeCashAccount ? 'View Office Cash Ledger' : undefined}
        >
          <div className="stat-card-header">
            <span className="stat-pill-tag tag-cash">● PHYSICAL CASH</span>
            <span className="stat-num-badge">01</span>
          </div>
          <div className="stat-label">OFFICE CASH</div>
          <div className="text-muted text-xs mb-1">Current physical cash in office</div>
          <div className={`stat-value ${officeCashBalance >= 0 ? 'amount-credit' : 'amount-debit'}`}>
            {formatPKR(officeCashBalance)}
          </div>
          <div className="stat-sub mt-2">
            <span>{officeCashAccount ? `${officeCashAccount.txnCount} transactions` : 'Cash drawer'}</span>
          </div>
        </div>

        {/* Card 2: Total Bank Balance */}
        <div
          className="money-position-card pos-bank"
          onClick={() => { setAccountFilter('bank'); }}
          style={{ cursor: 'pointer' }}
          title="Filter to Bank Accounts"
        >
          <div className="stat-card-header">
            <span className="stat-pill-tag tag-credit">● {bankAccounts.length} BANKS</span>
            <span className="stat-num-badge">02</span>
          </div>
          <div className="stat-label">TOTAL BANK BALANCE</div>
          <div className="text-muted text-xs mb-1">All bank accounts combined</div>
          <div className={`stat-value ${totalBankBalance >= 0 ? 'amount-credit' : 'amount-debit'}`}>
            {formatPKR(totalBankBalance)}
          </div>
          <div className="stat-sub mt-2">
            <span>Across Meezan, HBL, MCB & more</span>
          </div>
        </div>

        {/* Card 3: Total Wallet Balance */}
        <div
          className="money-position-card pos-wallet"
          onClick={() => { setAccountFilter('wallet'); }}
          style={{ cursor: 'pointer' }}
          title="Filter to Digital Wallets"
        >
          <div className="stat-card-header">
            <span className="stat-pill-tag tag-records">● {walletAccounts.length} WALLETS</span>
            <span className="stat-num-badge">03</span>
          </div>
          <div className="stat-label">TOTAL WALLET BALANCE</div>
          <div className="text-muted text-xs mb-1">EasyPaisa + JazzCash</div>
          <div className={`stat-value ${totalWalletBalance >= 0 ? 'amount-credit' : 'amount-debit'}`}>
            {formatPKR(totalWalletBalance)}
          </div>
          <div className="stat-sub mt-2">
            <span>Instant mobile money float</span>
          </div>
        </div>

        {/* Card 4: Total Available */}
        <div className="money-position-card pos-total">
          <div className="stat-card-header">
            <span className="stat-pill-tag tag-net">● LIQUID POSITION</span>
            <span className="stat-num-badge">04</span>
          </div>
          <div className="stat-label">TOTAL AVAILABLE</div>
          <div className="text-muted text-xs mb-1">Cash + Banks + Wallets</div>
          <div className={`stat-value ${totalAvailableBalance >= 0 ? 'amount-credit' : 'amount-debit'}`} style={{ color: '#1d4ed8' }}>
            {formatPKR(totalAvailableBalance)}
          </div>
          <div className="stat-sub mt-2">
            <span>Total liquid business capital</span>
          </div>
        </div>
      </div>

      {/* ─── MONEY MOVEMENT (Excluding Internal Transfers) ──────────── */}
      <div className="section-header-wrap">
        <div className="section-headline">
          <span>MONEY MOVEMENT</span>
        </div>
        <p className="section-subheadline">
          Operational business cash flow (internal transfers excluded)
        </p>
      </div>

      <div className="money-movement-grid">
        {/* Card 1: Total Money In */}
        <div className="money-movement-card mov-in">
          <div className="stat-card-header">
            <span className="stat-pill-tag tag-credit">● NORMAL CREDITS</span>
            <span className="stat-num-badge">IN</span>
          </div>
          <div className="stat-label">TOTAL MONEY IN</div>
          <div className="text-muted text-xs mb-1">All normal business credits received</div>
          <div className="stat-value amount-credit">{formatPKR(totalMoneyIn)}</div>
          <div className="stat-sub mt-2">
            <span>{businessTxns.filter(t => t.creditPaisa > 0).length} revenue entries</span>
          </div>
        </div>

        {/* Card 2: Total Money Out */}
        <div className="money-movement-card mov-out">
          <div className="stat-card-header">
            <span className="stat-pill-tag tag-debit">● NORMAL DEBITS</span>
            <span className="stat-num-badge">OUT</span>
          </div>
          <div className="stat-label">TOTAL MONEY OUT</div>
          <div className="text-muted text-xs mb-1">All normal business debits & payments</div>
          <div className="stat-value amount-debit">{formatPKR(totalMoneyOut)}</div>
          <div className="stat-sub mt-2">
            <span>{businessTxns.filter(t => t.debitPaisa > 0).length} payment entries</span>
          </div>
        </div>

        {/* Card 3: Net Movement */}
        <div className="money-movement-card mov-net">
          <div className="stat-card-header">
            <span className="stat-pill-tag tag-net">● OPERATING NET</span>
            <span className="stat-num-badge">NET</span>
          </div>
          <div className="stat-label">NET MOVEMENT</div>
          <div className="text-muted text-xs mb-1">Money In − Money Out</div>
          <div className={`stat-value ${netBusinessMovement >= 0 ? 'amount-credit' : 'amount-debit'}`}>
            {netBusinessMovement >= 0 ? '+' : ''}{formatPKR(netBusinessMovement)}
          </div>
          <div className="stat-sub mt-2">
            <span>Net business cash generation</span>
          </div>
        </div>
      </div>

      <div className="internal-transfer-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Internal transfers between accounts (e.g. Office Cash ↔ Meezan Bank) never inflate Money In or Money Out.</span>
      </div>

      {/* ─── Accounts Overview (Nova Glass Cards) ──────────────────── */}
      {accountsWithBalance.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <div className="card-title" style={{ fontSize: '1.05rem', letterSpacing: '0.04em' }}>
                ACCOUNTS OVERVIEW
              </div>
              <p className="text-muted text-xs">Live balances & real-time activity across cash, banks & digital wallets</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className={`btn btn-sm ${accountFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAccountFilter('all')}
                style={{ padding: '5px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-pill)' }}
              >
                All ({activeAccounts.length})
              </button>
              <button
                className={`btn btn-sm ${accountFilter === 'bank' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAccountFilter('bank')}
                style={{ padding: '5px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-pill)' }}
              >
                Banks ({bankAccounts.length})
              </button>
              <button
                className={`btn btn-sm ${accountFilter === 'wallet' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAccountFilter('wallet')}
                style={{ padding: '5px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-pill)' }}
              >
                Wallets ({walletAccounts.length})
              </button>
              <button
                className={`btn btn-sm ${accountFilter === 'cash' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAccountFilter('cash')}
                style={{ padding: '5px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-pill)' }}
              >
                Cash ({cashAccounts.length})
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/accounts')}
                style={{ padding: '5px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-pill)' }}
              >
                Manage All →
              </button>
            </div>
          </div>

          <div className="stats-grid">
            {displayedAccounts.map((account, index) => {
              const totalInOut = account.totalCredit + account.totalDebit;
              const inPercent = totalInOut > 0 ? Math.round((account.totalCredit / totalInOut) * 100) : 50;

              return (
                <div
                  key={account.id}
                  className="stat-card account-card-nova"
                  onClick={() => navigate(`/accounts/${account.id}`)}
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
                      style={{
                        width: `${inPercent}%`,
                        background: account.color || 'var(--pal-teal)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nova Glass Cash Flow Meter Card */}
      <div className="card mt-6 nova-flow-card">
        <div className="card-header flex justify-between items-center">
          <div>
            <div className="card-title">CASH FLOW DYNAMICS</div>
            <p className="text-muted text-sm">Income vs Expense Distribution</p>
          </div>
          <div className="nova-flow-tags">
            <span className="badge badge-credit">Inflow {summary.totalCreditPaisa + summary.totalDebitPaisa > 0 ? Math.round((summary.totalCreditPaisa / (summary.totalCreditPaisa + summary.totalDebitPaisa)) * 100) : 0}%</span>
            <span className="badge badge-debit">Outflow {summary.totalCreditPaisa + summary.totalDebitPaisa > 0 ? Math.round((summary.totalDebitPaisa / (summary.totalCreditPaisa + summary.totalDebitPaisa)) * 100) : 0}%</span>
          </div>
        </div>
        <div className="nova-progress-track">
          <div
            className="nova-progress-fill-credit"
            style={{ width: `${summary.totalCreditPaisa + summary.totalDebitPaisa > 0 ? Math.round((summary.totalCreditPaisa / (summary.totalCreditPaisa + summary.totalDebitPaisa)) * 100) : 50}%` }}
            title="Credit Share"
          />
          <div
            className="nova-progress-fill-debit"
            style={{ width: `${summary.totalCreditPaisa + summary.totalDebitPaisa > 0 ? Math.round((summary.totalDebitPaisa / (summary.totalCreditPaisa + summary.totalDebitPaisa)) * 100) : 50}%` }}
            title="Debit Share"
          />
        </div>
      </div>

      {/* Today & Month Activity */}
      <div className="activity-grid mt-6">
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <div className="card-title">Today's Activity</div>
            <span className="stat-num-badge">DAY</span>
          </div>
          <div className="activity-row">
            <span className="text-muted text-sm">Credit (Received)</span>
            <span className="amount-credit font-semibold">{formatPKR(todayCredit)}</span>
          </div>
          <div className="activity-row">
            <span className="text-muted text-sm">Debit (Paid)</span>
            <span className="amount-debit font-semibold">{formatPKR(todayDebit)}</span>
          </div>
          <div className="activity-row total">
            <span className="text-sm font-semibold">Transactions</span>
            <span className="font-bold">{todayTxns.length}</span>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <div className="card-title">This Month</div>
            <span className="stat-num-badge">MONTH</span>
          </div>
          <div className="activity-row">
            <span className="text-muted text-sm">Credit (Received)</span>
            <span className="amount-credit font-semibold">{formatPKR(monthCredit)}</span>
          </div>
          <div className="activity-row">
            <span className="text-muted text-sm">Debit (Paid)</span>
            <span className="amount-debit font-semibold">{formatPKR(monthDebit)}</span>
          </div>
          <div className="activity-row total">
            <span className="text-sm font-semibold">Transactions</span>
            <span className="font-bold">{monthTxns.length}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card mt-6">
          <div className="card-header flex justify-between items-center">
            <div className="card-title">30-Day Activity</div>
            <div className="chart-legend">
              <span className="legend-dot credit" />Credit
              <span className="legend-dot debit" />Debit
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--clr-green)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--clr-green)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDebit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--clr-red)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--clr-red)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--clr-text-muted)', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--clr-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--clr-text-secondary)' }}
                formatter={(val) => [`Rs. ${Number(val).toLocaleString()}`, undefined]}
              />
              <Area type="monotone" dataKey="Credit" stroke="var(--clr-green)" fill="url(#colorCredit)" strokeWidth={2} />
              <Area type="monotone" dataKey="Debit"  stroke="var(--clr-red)"   fill="url(#colorDebit)"  strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card mt-6">
        <div className="card-header flex justify-between items-center">
          <div className="card-title">Recent Transactions</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/ledger')}>
            View All
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <h3>No transactions yet</h3>
            <p>Add your first transaction to get started.</p>
            <button className="btn btn-primary" onClick={() => onAddTransaction()}>
              Add First Entry
            </button>
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
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(t => (
                  <tr key={t.id}>
                    <td className="text-sm text-muted">{formatDisplayDate(t.date)}</td>
                    <td className="font-semibold">{t.partyName}</td>
                    <td className="text-muted text-sm">{t.description}</td>
                    <td className="text-right">{t.debitPaisa > 0 ? <span className="amount-debit">{formatPKR(t.debitPaisa)}</span> : <span className="text-muted">—</span>}</td>
                    <td className="text-right">{t.creditPaisa > 0 ? <span className="amount-credit">{formatPKR(t.creditPaisa)}</span> : <span className="text-muted">—</span>}</td>
                    <td className="text-right"><span className="amount-balance">{formatPKR(t.runningBalance)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions mt-6">
        <div className="card-title mb-4">Quick Actions</div>
        <div className="quick-actions-grid">
          {[
            { label: 'Add Credit', icon: '＋', cls: 'success', action: () => onAddTransaction('credit'), id: 'qa-credit' },
            { label: 'Add Debit',  icon: '－', cls: 'danger',  action: () => onAddTransaction('debit'),  id: 'qa-debit' },
            { label: 'View Ledger',icon: '≡',  cls: 'ghost',   action: () => navigate('/ledger'),         id: 'qa-ledger' },
            { label: 'Reports',    icon: '▦',  cls: 'ghost',   action: () => navigate('/reports'),        id: 'qa-reports' },
            { label: 'Export',     icon: '↓',  cls: 'ghost',   action: () => navigate('/export'),         id: 'qa-export' },
            { label: 'Import',     icon: '↑',  cls: 'ghost',   action: () => navigate('/import'),         id: 'qa-import' },
          ].map(a => (
            <button key={a.id} id={a.id} className={`btn btn-${a.cls} quick-action-btn`} onClick={a.action}>
              <span className="quick-action-icon">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
