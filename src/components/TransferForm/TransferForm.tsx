// src/components/TransferForm/TransferForm.tsx
import React, { useState } from 'react';
import { useAccountStore } from '../../stores/accountStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAuthStore } from '../../stores/authStore';
import { rupeesToPaisa } from '../../utils/money';
import { todayISO } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import './TransferForm.css';

interface Props {
  onClose: () => void;
}

const TransferForm: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuthStore();
  const { accounts, transferBetweenAccounts } = useAccountStore();
  const { loadAll } = useTransactionStore();
  const userId = user?.id || 'local-user';

  const activeAccounts = accounts.filter(a => a.isActive);

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fromAccountId) errs.from = 'Select source account';
    if (!toAccountId) errs.to = 'Select destination account';
    if (fromAccountId && toAccountId && fromAccountId === toAccountId)
      errs.to = 'Source and destination must be different';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      errs.amount = 'Enter a valid positive amount';
    if (!date) errs.date = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const amountPaisa = rupeesToPaisa(Number(amount));
      await transferBetweenAccounts(
        fromAccountId,
        toAccountId,
        amountPaisa,
        userId,
        description.trim() || undefined,
        date
      );
      await loadAll(userId);
      const fromName = accounts.find(a => a.id === fromAccountId)?.name || '';
      const toName = accounts.find(a => a.id === toAccountId)?.name || '';
      toast.success(`Rs. ${Number(amount).toLocaleString()} transferred: ${fromName} → ${toName}`);
      onClose();
    } catch (err) {
      console.error('Transfer failed:', err);
      toast.error('Transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="modal modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-form-title"
        style={{
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '520px',
        }}
      >
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h3 id="transfer-form-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 014-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
            Transfer Between Accounts
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <div
            className="modal-body"
            style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '20px 24px' }}
          >
            {/* From → To Account Selectors */}
            <div className="transfer-accounts-row">
              <div className="transfer-account-select">
                <label htmlFor="transfer-from">From Account</label>
                <select
                  id="transfer-from"
                  className={`form-select ${errors.from ? 'error' : ''}`}
                  value={fromAccountId}
                  onChange={e => setFromAccountId(e.target.value)}
                >
                  <option value="">Select source…</option>
                  {activeAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                  ))}
                </select>
                {errors.from && <span className="form-error">{errors.from}</span>}
              </div>

              <div className="transfer-arrow">→</div>

              <div className="transfer-account-select">
                <label htmlFor="transfer-to">To Account</label>
                <select
                  id="transfer-to"
                  className={`form-select ${errors.to ? 'error' : ''}`}
                  value={toAccountId}
                  onChange={e => setToAccountId(e.target.value)}
                >
                  <option value="">Select destination…</option>
                  {activeAccounts
                    .filter(a => a.id !== fromAccountId)
                    .map(a => (
                      <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                    ))}
                </select>
                {errors.to && <span className="form-error">{errors.to}</span>}
              </div>
            </div>

            {/* Amount + Date */}
            <div className="form-row" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="transfer-amount">
                  Amount (Rs.) <span className="required">*</span>
                </label>
                <div className="amount-input-wrap">
                  <span className="amount-prefix">Rs.</span>
                  <input
                    id="transfer-amount"
                    type="number"
                    className={`form-input amount-input ${errors.amount ? 'error' : ''}`}
                    placeholder="0"
                    value={amount}
                    min="0.01"
                    step="0.01"
                    onChange={e => setAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                {errors.amount && <span className="form-error">{errors.amount}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="transfer-date">
                  Date <span className="required">*</span>
                </label>
                <input
                  id="transfer-date"
                  type="date"
                  className={`form-input ${errors.date ? 'error' : ''}`}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
                {errors.date && <span className="form-error">{errors.date}</span>}
              </div>
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label" htmlFor="transfer-desc">Description (optional)</label>
              <input
                id="transfer-desc"
                type="text"
                className="form-input"
                placeholder="e.g. Funds moved for rent payment"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div
            className="modal-footer"
            style={{
              flexShrink: 0,
              position: 'sticky',
              bottom: 0,
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              padding: '14px 24px',
              borderTop: '1px solid rgba(101, 113, 102, 0.15)',
              background: 'rgba(245, 248, 247, 0.98)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="transfer-form-submit"
            >
              {loading ? (
                <><span className="spinner" />Transferring…</>
              ) : (
                'Transfer Funds'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferForm;
