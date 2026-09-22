// src/components/TransactionForm/TransactionForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAuthStore } from '../../stores/authStore';
import { rupeesToPaisa, paisaToRupees } from '../../utils/money';
import { todayISO } from '../../utils/dateUtils';
import type { Transaction } from '../../db/schema';
import toast from 'react-hot-toast';
import './TransactionForm.css';

interface Props {
  onClose: () => void;
  editTransaction?: Transaction | null;
  defaultType?: 'credit' | 'debit';
}

const TransactionForm: React.FC<Props> = ({ onClose, editTransaction, defaultType = 'credit' }) => {
  const { user } = useAuthStore();
  const { addTransaction, updateTransaction, categories, paymentMethods, addCategory, addPaymentMethod } = useTransactionStore();
  const userId = user?.id || 'local-user';

  const [type, setType] = useState<'credit' | 'debit'>(
    editTransaction ? (editTransaction.creditPaisa > 0 ? 'credit' : 'debit') : defaultType
  );
  const [date, setDate] = useState(editTransaction?.date || todayISO());
  const [partyName, setPartyName] = useState(editTransaction?.partyName || '');
  const [description, setDescription] = useState(editTransaction?.description || '');
  const [amount, setAmount] = useState(
    editTransaction
      ? String(paisaToRupees(editTransaction.creditPaisa || editTransaction.debitPaisa))
      : ''
  );
  const [category, setCategory] = useState(editTransaction?.category || '');
  const [paymentMethod, setPaymentMethod] = useState(editTransaction?.paymentMethod || '');
  const [referenceNumber, setReferenceNumber] = useState(editTransaction?.referenceNumber || '');
  const [notes, setNotes] = useState(editTransaction?.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { amountRef.current?.focus(); }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!date) errs.date = 'Date is required.';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      errs.amount = 'Enter a valid positive amount.';
    if (!partyName.trim()) errs.partyName = 'Party name is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const paisaAmount = rupeesToPaisa(Number(amount));

    try {
      const finalDescription = description.trim() || (type === 'credit' ? 'Payment Received' : 'Payment Made');
      const data = {
        date,
        partyName: partyName.trim(),
        description: finalDescription,
        category,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        debitPaisa:  type === 'debit'  ? paisaAmount : 0,
        creditPaisa: type === 'credit' ? paisaAmount : 0,
      };

      if (editTransaction) {
        await updateTransaction(editTransaction.id, data);
        toast.success('Transaction updated successfully');
      } else {
        await addTransaction(data, userId);
        toast.success(`${type === 'credit' ? 'Credit' : 'Debit'} of Rs. ${Number(amount).toLocaleString()} added`);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      toast.error('Unable to save transaction. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryInput.trim() || !userId) return;
    await addCategory(newCategoryInput.trim(), userId);
    setCategory(newCategoryInput.trim());
    setNewCategoryInput('');
    setShowNewCategory(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="modal modal-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="txn-form-title"
        style={{
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '540px',
        }}
      >
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h3 id="txn-form-title">
            {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            className="modal-body"
            style={{
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              padding: '20px 24px',
              maxHeight: 'calc(85vh - 130px)',
            }}
          >
            {/* Type Selector */}
            <div className="txn-type-selector">
              <button
                type="button"
                className={`txn-type-btn credit ${type === 'credit' ? 'active' : ''}`}
                onClick={() => setType('credit')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Credit (Received)
              </button>
              <button
                type="button"
                className={`txn-type-btn debit ${type === 'debit' ? 'active' : ''}`}
                onClick={() => setType('debit')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Debit (Paid)
              </button>
            </div>

            <div className="form-row" style={{ marginTop: 20 }}>
              {/* Amount */}
              <div className="form-group">
                <label className="form-label" htmlFor="txn-amount">
                  Amount (Rs.) <span className="required">*</span>
                </label>
                <div className="amount-input-wrap">
                  <span className="amount-prefix">Rs.</span>
                  <input
                    ref={amountRef}
                    id="txn-amount"
                    type="number"
                    className={`form-input amount-input ${errors.amount ? 'error' : ''}`}
                    placeholder="0"
                    value={amount}
                    min="0.01"
                    step="0.01"
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                {errors.amount && <span className="form-error">{errors.amount}</span>}
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="txn-date">
                  Date <span className="required">*</span>
                </label>
                <input
                  id="txn-date"
                  type="date"
                  className={`form-input ${errors.date ? 'error' : ''}`}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
                {errors.date && <span className="form-error">{errors.date}</span>}
              </div>
            </div>

            <div className="form-row" style={{ marginTop: 16 }}>
              {/* Party Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="txn-party">
                  Party / Name <span className="required">*</span>
                </label>
                <input
                  id="txn-party"
                  type="text"
                  className={`form-input ${errors.partyName ? 'error' : ''}`}
                  placeholder="e.g. Khadija Foods"
                  value={partyName}
                  onChange={e => setPartyName(e.target.value)}
                  list="party-suggestions"
                />
                {errors.partyName && <span className="form-error">{errors.partyName}</span>}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="txn-desc">
                  Description
                </label>
                <input
                  id="txn-desc"
                  type="text"
                  className={`form-input ${errors.description ? 'error' : ''}`}
                  placeholder="e.g. Payment Received"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
                {errors.description && <span className="form-error">{errors.description}</span>}
              </div>
            </div>

            <div className="form-row" style={{ marginTop: 16 }}>
              {/* Category */}
              <div className="form-group">
                <label className="form-label" htmlFor="txn-category">Category</label>
                <div className="select-with-add">
                  <select
                    id="txn-category"
                    className="form-select"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="">Select category…</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => setShowNewCategory(v => !v)}
                    title="Add custom category"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
                {showNewCategory && (
                  <div className="new-item-row">
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      placeholder="New category name"
                      value={newCategoryInput}
                      onChange={e => setNewCategoryInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddNewCategory())}
                    />
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleAddNewCategory}>Add</button>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label className="form-label" htmlFor="txn-payment">Payment Method</label>
                <select
                  id="txn-payment"
                  className="form-select"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <option value="">Select method…</option>
                  {paymentMethods.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row" style={{ marginTop: 16 }}>
              {/* Reference */}
              <div className="form-group">
                <label className="form-label" htmlFor="txn-ref">Reference / Bill #</label>
                <input
                  id="txn-ref"
                  type="text"
                  className="form-input"
                  placeholder="e.g. INV-001"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label" htmlFor="txn-notes">Notes</label>
              <textarea
                id="txn-notes"
                className="form-textarea"
                placeholder="Optional additional notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
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
              className={`btn ${type === 'credit' ? 'btn-success' : 'btn-danger'}`}
              disabled={loading}
              id="txn-form-submit"
            >
              {loading ? (
                <><span className="spinner" />Saving…</>
              ) : (
                editTransaction
                  ? 'Update Transaction'
                  : `Add ${type === 'credit' ? 'Credit' : 'Debit'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
