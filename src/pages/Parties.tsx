// src/pages/Parties.tsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionStore } from '../stores/transactionStore';
import { calculateSummary } from '../utils/balance';
import { formatPKR } from '../utils/money';

const Parties: React.FC = () => {
  const { transactions, settings } = useTransactionStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const openingBalance = settings?.openingBalancePaisa ?? 0;
  const active = useMemo(() => transactions.filter(t => !t.isDeleted), [transactions]);

  // Group by party
  const parties = useMemo(() => {
    const map = new Map<string, { credit: number; debit: number; count: number; lastDate: string }>();
    active.forEach(t => {
      const name = t.partyName || 'Unknown';
      const existing = map.get(name) || { credit: 0, debit: 0, count: 0, lastDate: '' };
      map.set(name, {
        credit: existing.credit + t.creditPaisa,
        debit:  existing.debit  + t.debitPaisa,
        count:  existing.count  + 1,
        lastDate: t.date > existing.lastDate ? t.date : existing.lastDate,
      });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data, net: data.credit - data.debit }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [active]);

  const filtered = useMemo(() =>
    parties.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [parties, search]
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <h1>Parties</h1>
          <p className="text-muted text-sm">{parties.length} unique parties</p>
        </div>
        <input
          type="search" className="form-input" style={{ width: 240 }}
          placeholder="Search parties…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <h3>No parties found</h3>
          <p>Parties are automatically created when you add transactions.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Party Name</th>
                  <th className="text-right">Credit</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Net Balance</th>
                  <th className="text-right">Txns</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.name} style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/parties/${encodeURIComponent(p.name)}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--clr-accent-glow)', color: 'var(--clr-accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0,
                        }}>
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td className="text-right amount-credit">{formatPKR(p.credit)}</td>
                    <td className="text-right amount-debit">{formatPKR(p.debit)}</td>
                    <td className="text-right">
                      <span className={p.net >= 0 ? 'amount-credit' : 'amount-debit'}>
                        {formatPKR(p.net)}
                      </span>
                    </td>
                    <td className="text-right text-muted text-sm">{p.count}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm">View →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parties;
