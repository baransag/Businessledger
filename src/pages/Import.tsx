// src/pages/Import.tsx
import React, { useState, useRef } from 'react';
import { useTransactionStore } from '../stores/transactionStore';
import { useAuthStore } from '../stores/authStore';
import { parseCSV, parseExcel, detectDuplicates, type ImportRow } from '../utils/csvImport';
import { formatPKR } from '../utils/money';
import { formatDisplayDate } from '../utils/dateUtils';
import toast from 'react-hot-toast';

type ImportStep = 'upload' | 'preview' | 'done';

const Import: React.FC = () => {
  const { transactions, addTransaction } = useTransactionStore();
  const { user } = useAuthStore();
  const userId = user?.id || 'local-user';
  const [step, setStep] = useState<ImportStep>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    setFileName(file.name);
    try {
      let parsed: ImportRow[];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv') {
        parsed = await parseCSV(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        parsed = await parseExcel(file);
      } else {
        setError('Unsupported file type. Please use CSV or Excel (.xlsx/.xls).');
        setLoading(false);
        return;
      }

      // Detect duplicates
      const withDupes = detectDuplicates(parsed, transactions.filter(t => !t.isDeleted));
      setRows(withDupes);

      // Pre-select valid, non-duplicate rows
      const validIds = new Set(withDupes
        .filter(r => r._errors.length === 0 && !r._isDuplicate)
        .map(r => r.id)
      );
      setSelected(validIds);
      setStep('preview');
    } catch (e) {
      setError('Failed to parse file. Please check the format and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    
    const toImport = rows.filter(r => selected.has(r.id));
    if (toImport.length === 0) { toast.error('No rows selected.'); return; }
    setLoading(true);
    let count = 0;
    for (const row of toImport) {
      try {
        await addTransaction({
          date:            row.date,
          partyName:       row.partyName,
          description:     row.description,
          category:        row.category,
          paymentMethod:   row.paymentMethod,
          referenceNumber: row.referenceNumber,
          debitPaisa:      row.debitPaisa,
          creditPaisa:     row.creditPaisa,
          notes:           row.notes,
        }, userId);
        count++;
      } catch { /* skip individual failed rows */ }
    }
    setLoading(false);
    toast.success(`Successfully imported ${count} transaction${count !== 1 ? 's' : ''}.`);
    setStep('done');
  };

  const reset = () => {
    setStep('upload');
    setRows([]);
    setSelected(new Set());
    setError(null);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const validCount   = rows.filter(r => r._errors.length === 0 && !r._isDuplicate).length;
  const dupCount     = rows.filter(r => r._isDuplicate).length;
  const invalidCount = rows.filter(r => r._errors.length > 0).length;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="page-header">
        <div>
          <h1>Import Transactions</h1>
          <p className="text-muted text-sm">Upload CSV or Excel files to import transaction records</p>
        </div>
      </div>

      {/* Steps */}
      <div className="import-steps mb-6">
        {(['upload','preview','done'] as ImportStep[]).map((s, i) => (
          <div key={s} className={`import-step ${step === s ? 'active' : step === 'done' || (step === 'preview' && i === 0) ? 'done' : ''}`}>
            <div className="import-step-num">{i + 1}</div>
            <span>{s === 'upload' ? 'Upload File' : s === 'preview' ? 'Review & Confirm' : 'Done'}</span>
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div className="card">
          <div
            className="drop-zone"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            {loading ? (
              <><div className="spinner spinner-lg" /><p>Parsing file…</p></>
            ) : (
              <>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--clr-text-muted)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <h3 style={{ color: 'var(--clr-text-secondary)' }}>Drop file here or click to browse</h3>
                <p className="text-muted text-sm">Supported: CSV, Excel (.xlsx, .xls)</p>
                <button className="btn btn-primary" style={{ marginTop: 12 }}>Choose File</button>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {error && <div className="alert alert-error mt-4">{error}</div>}

          <div className="mt-6">
            <div className="card-title mb-3">Import Format Guide</div>
            <p className="text-muted text-sm mb-2">Your file should contain columns matching these headers (flexible naming):</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Field</th><th>Accepted Column Names</th><th>Required?</th></tr></thead>
                <tbody>
                  {[
                    ['Date',           'date, transaction date, txn date, dt', 'Recommended'],
                    ['Party Name',     'party, party name, name, customer, vendor', 'No'],
                    ['Description',    'description, narration, details, particulars', 'No'],
                    ['Category',       'category, type, group', 'No'],
                    ['Payment Method', 'payment method, method, mode', 'No'],
                    ['Reference',      'reference, ref, bill, invoice', 'No'],
                    ['Debit',          'debit, dr, expense, withdrawal', 'One of these'],
                    ['Credit',         'credit, cr, income, deposit, received', 'One of these'],
                    ['Notes',          'notes, remarks, comment', 'No'],
                  ].map(([f, a, r]) => (
                    <tr key={f}><td className="font-semibold">{f}</td><td className="text-muted text-sm">{a}</td>
                      <td><span className={`badge ${r.includes('One') ? 'badge-amber' : r === 'Recommended' ? 'badge-blue' : 'badge-muted'}`}>{r}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <div className="flex gap-4 text-sm">
              <span>File: <strong>{fileName}</strong></span>
              <span className="badge badge-green">{validCount} valid</span>
              {dupCount > 0 && <span className="badge badge-amber">{dupCount} duplicate</span>}
              {invalidCount > 0 && <span className="badge badge-red">{invalidCount} invalid</span>}
              <span className="text-muted">Selected: {selected.size}</span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={reset}>Back</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set(rows.filter(r=>r._errors.length===0).map(r=>r.id)))}>
                Select All Valid
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Deselect All</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={loading || selected.size === 0}>
                {loading ? <><span className="spinner" />Importing…</> : `Import ${selected.size} Rows`}
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox"
                        checked={selected.size === rows.filter(r => r._errors.length===0).length && rows.length > 0}
                        onChange={e => setSelected(e.target.checked ? new Set(rows.filter(r=>r._errors.length===0).map(r=>r.id)) : new Set())}
                      />
                    </th>
                    <th>Status</th><th>Date</th><th>Party</th><th>Description</th>
                    <th className="text-right">Debit</th><th className="text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} style={{ opacity: row._errors.length > 0 ? 0.5 : 1 }}>
                      <td>
                        <input type="checkbox"
                          checked={selected.has(row.id)}
                          disabled={row._errors.length > 0}
                          onChange={() => toggleRow(row.id)}
                        />
                      </td>
                      <td>
                        {row._errors.length > 0 ? (
                          <span className="badge badge-red" title={row._errors.join('; ')}>Invalid</span>
                        ) : row._isDuplicate ? (
                          <span className="badge badge-amber">Possible Duplicate</span>
                        ) : (
                          <span className="badge badge-green">Valid</span>
                        )}
                      </td>
                      <td className="text-sm">{formatDisplayDate(row.date)}</td>
                      <td>{row.partyName || '—'}</td>
                      <td className="text-muted text-sm">{row.description || '—'}</td>
                      <td className="text-right">{row.debitPaisa  > 0 ? <span className="amount-debit">{formatPKR(row.debitPaisa)}</span> : '—'}</td>
                      <td className="text-right">{row.creditPaisa > 0 ? <span className="amount-credit">{formatPKR(row.creditPaisa)}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card text-center" style={{ padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2>Import Complete</h2>
          <p className="text-muted mt-2">Your transactions have been added to the ledger.</p>
          <div className="flex gap-3 justify-end mt-6" style={{ justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={reset}>Import Another File</button>
            <button className="btn btn-primary" onClick={() => window.location.href = '/ledger'}>View Ledger</button>
          </div>
        </div>
      )}

      <style>{`
        .import-steps { display: flex; gap: 8px; align-items: center; }
        .import-step { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--clr-text-muted); }
        .import-step.active { color: var(--clr-accent); }
        .import-step.done { color: var(--clr-green); }
        .import-step-num { width: 24px; height: 24px; border-radius: 50%; border: 2px solid currentColor;
          display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
        .drop-zone { border: 2px dashed var(--clr-border); border-radius: var(--radius-lg); padding: 60px 24px;
          display: flex; flex-direction: column; align-items: center; gap: 12px; cursor: pointer;
          transition: border-color var(--transition), background var(--transition); }
        .drop-zone:hover { border-color: var(--clr-accent); background: var(--clr-accent-glow); }
      `}</style>
    </div>
  );
};

export default Import;
