// src/pages/Dashboard.tsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/transactionStore';
import { useAccountStore } from '../stores/accountStore';
import { useAuthStore } from '../stores/authStore';
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
  const { accounts } = useAccountStore();
  const getAccountsWithBalance = useAccountStore(s => s.getAccountsWithBalance);
  const accountsWithBalance = useMemo(
    () => getAccountsWithBalance(transactions),
    [accounts, transactions]
  );
  const topAccounts = useMemo(
    () => accountsWithBalance.filter(a => a.isActive).slice(0, 4),
    [accountsWithBalance]
  );

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

      {/* ─── Accounts Overview ──────────────────────────────────── */}
      {topAccounts.length > 0 && (
        <div className="card mt-6">
          <div className="card-header flex justify-between items-center">
            <div className="card-title">Accounts Overview</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/accounts')}>
              View All
            </button>
          </div>
          <div className="accounts-grid" style={{ padding: '4px 0' }}>
            {topAccounts.map(account => (
              <div
                key={account.id}
                className="account-card"
                onClick={() => navigate(`/accounts/${account.id}`)}
                style={{ cursor: 'pointer' }}
              >
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
                  <span className="label">In</span>
                  <span className="value credit">{formatPKR(account.totalCredit)}</span>
                </div>
                <div className="account-card-row">
                  <span className="label">Out</span>
                  <span className="value debit">{formatPKR(account.totalDebit)}</span>
                </div>
              </div>
            ))}
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
