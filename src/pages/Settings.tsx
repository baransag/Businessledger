// src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { useTransactionStore } from '../stores/transactionStore';
import { useAuthStore } from '../stores/authStore';
import { rupeesToPaisa, paisaToRupees } from '../utils/money';
import { isSupabaseConfigured } from '../sync/supabaseClient';
import { syncTransactions } from '../sync/syncEngine';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { settings, saveSettings, addCategory, addPaymentMethod, categories, paymentMethods } = useTransactionStore();
  const { user, signOut, updatePassword } = useAuthStore();
  const navigate = useNavigate();
  const userId = user?.id || 'local-user';

  const [businessTitle, setBusinessTitle]   = useState(settings?.businessTitle || '');
  const [pdfHeader, setPdfHeader]           = useState(settings?.pdfHeader || '');
  const [openingBalance, setOpeningBalance] = useState(settings ? String(paisaToRupees(settings.openingBalancePaisa)) : '0');
  const [openingDate, setOpeningDate]       = useState(settings?.openingBalanceDate || '');
  const [openingNote, setOpeningNote]       = useState(settings?.openingBalanceNote || '');
  const [newCat, setNewCat]                 = useState('');
  const [newPm, setNewPm]                   = useState('');
  const [newPwd, setNewPwd]                 = useState('');
  const [confirmPwd, setConfirmPwd]         = useState('');
  const [syncing, setSyncing]               = useState(false);
  const [syncResult, setSyncResult]         = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);

  useEffect(() => {
    if (settings) {
      setBusinessTitle(settings.businessTitle);
      setPdfHeader(settings.pdfHeader);
      setOpeningBalance(String(paisaToRupees(settings.openingBalancePaisa)));
      setOpeningDate(settings.openingBalanceDate);
      setOpeningNote(settings.openingBalanceNote);
    }
  }, [settings]);

  const handleSaveGeneral = async () => {
    setSaving(true);
    await saveSettings({
      businessTitle,
      pdfHeader,
      openingBalancePaisa: rupeesToPaisa(parseFloat(openingBalance) || 0),
      openingBalanceDate: openingDate,
      openingBalanceNote: openingNote,
    }, userId);
    setSaving(false);
    toast.success('Settings saved.');
  };

  const handleAddCategory = async () => {
    if (!newCat.trim()) return;
    await addCategory(newCat.trim(), userId);
    setNewCat('');
    toast.success('Category added.');
  };

  const handleAddPM = async () => {
    if (!newPm.trim()) return;
    await addPaymentMethod(newPm.trim(), userId);
    setNewPm('');
    toast.success('Payment method added.');
  };

  const handleChangePassword = async () => {
    if (!newPwd || newPwd.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match.'); return; }
    const { error } = await updatePassword(newPwd);
    if (error) toast.error(error);
    else { toast.success('Password changed successfully.'); setNewPwd(''); setConfirmPwd(''); }
  };

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null);
    const result = await syncTransactions(userId);
    setSyncing(false);
    if (result.error) { setSyncResult('❌ ' + result.error); toast.error(result.error); }
    else { setSyncResult(`✅ Pushed ${result.pushed}, pulled ${result.pulled}${result.conflicts ? `, ${result.conflicts} conflict(s)` : ''}`); toast.success('Sync complete.'); }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header"><div><h1>Settings</h1><p className="text-muted text-sm">Application configuration and account management</p></div></div>

      {/* Account */}
      <div className="card mb-6">
        <div className="card-header"><div className="card-title">Account</div></div>
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width:40,height:40,borderRadius:'50%',background:'var(--clr-accent)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'1rem' }}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-semibold">{user?.email}</div>
            <div className="text-muted text-sm">Owner</div>
          </div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleLogout}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>

      {/* Change Password */}
      {isSupabaseConfigured && (
        <div className="card mb-6">
          <div className="card-header"><div className="card-title">Change Password</div></div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repeat password" />
            </div>
          </div>
          <button className="btn btn-primary mt-4" onClick={handleChangePassword}>Update Password</button>
        </div>
      )}

      {/* General Settings */}
      <div className="card mb-6">
        <div className="card-header"><div className="card-title">General</div></div>
        <div className="form-row mb-4">
          <div className="form-group">
            <label className="form-label">Business / Statement Title</label>
            <input type="text" className="form-input" value={businessTitle} onChange={e => setBusinessTitle(e.target.value)} placeholder="My Business" />
          </div>
          <div className="form-group">
            <label className="form-label">PDF Header Text</label>
            <input type="text" className="form-input" value={pdfHeader} onChange={e => setPdfHeader(e.target.value)} placeholder="Financial Statement" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSaveGeneral} disabled={saving}>
          {saving ? <><span className="spinner" />Saving…</> : 'Save Changes'}
        </button>
      </div>

      {/* Opening Balance */}
      <div className="card mb-6">
        <div className="card-header"><div className="card-title">Opening Balance</div></div>
        <div className="form-row mb-4">
          <div className="form-group">
            <label className="form-label">Opening Balance (Rs.)</label>
            <input type="number" className="form-input" value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)} placeholder="0" min="0" step="0.01" />
          </div>
          <div className="form-group">
            <label className="form-label">Opening Balance Date</label>
            <input type="date" className="form-input" value={openingDate} onChange={e => setOpeningDate(e.target.value)} />
          </div>
        </div>
        <div className="form-group mb-4">
          <label className="form-label">Note (optional)</label>
          <input type="text" className="form-input" value={openingNote} onChange={e => setOpeningNote(e.target.value)} placeholder="e.g. Starting balance" />
        </div>
        <button className="btn btn-primary" onClick={handleSaveGeneral} disabled={saving}>Save Opening Balance</button>
      </div>

      {/* Categories */}
      <div className="card mb-6">
        <div className="card-header"><div className="card-title">Categories ({categories.length})</div></div>
        <div className="tags-list mb-4">
          {categories.map(c => <span key={c.id} className="badge badge-blue">{c.name}</span>)}
        </div>
        <div className="flex gap-2">
          <input type="text" className="form-input" placeholder="New category name"
            value={newCat} onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
          <button className="btn btn-primary btn-sm" onClick={handleAddCategory}>Add</button>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="card mb-6">
        <div className="card-header"><div className="card-title">Payment Methods ({paymentMethods.length})</div></div>
        <div className="tags-list mb-4">
          {paymentMethods.map(p => <span key={p.id} className="badge badge-muted">{p.name}</span>)}
        </div>
        <div className="flex gap-2">
          <input type="text" className="form-input" placeholder="New payment method"
            value={newPm} onChange={e => setNewPm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddPM()} />
          <button className="btn btn-primary btn-sm" onClick={handleAddPM}>Add</button>
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="card mb-6">
        <div className="card-header"><div className="card-title">Cloud Synchronization</div></div>
        {!isSupabaseConfigured ? (
          <div className="alert alert-warning">
            Cloud sync is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.
          </div>
        ) : (
          <>
            <p className="text-muted text-sm mb-4">Sync your local transactions with Supabase cloud storage.</p>
            {syncResult && <div className="alert alert-info mb-4" style={{ marginBottom: 12 }}>{syncResult}</div>}
            <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
              {syncing ? <><span className="spinner" />Syncing…</> : '☁ Sync Now'}
            </button>
          </>
        )}
      </div>

      <style>{`.tags-list { display: flex; flex-wrap: wrap; gap: 6px; }`}</style>
    </div>
  );
};

export default Settings;
