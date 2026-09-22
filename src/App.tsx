import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useTransactionStore } from './stores/transactionStore';
import { syncTransactions } from './sync/syncEngine';
import { isSupabaseConfigured } from './sync/supabaseClient';
import DuroodBanner from './components/DuroodBanner/DuroodBanner';
import Sidebar from './components/Sidebar/Sidebar';
import BottomNav from './components/BottomNav/BottomNav';
import TransactionForm from './components/TransactionForm/TransactionForm';
import Login from './pages/Login';
import './index.css';

// Lazy-loaded pages
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Ledger      = lazy(() => import('./pages/Ledger'));
const Parties     = lazy(() => import('./pages/Parties'));
const PartyDetail = lazy(() => import('./pages/PartyDetail'));
const Reports     = lazy(() => import('./pages/Reports'));
const Import      = lazy(() => import('./pages/Import'));
const Export      = lazy(() => import('./pages/Export'));
const Settings    = lazy(() => import('./pages/Settings'));

const PageLoader = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300, gap:12, color:'var(--clr-text-muted)' }}>
    <div className="spinner spinner-lg" />
  </div>
);

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuthStore();
  if (status === 'loading') return <PageLoader />;
  // If Supabase not configured, allow access without auth (local-only mode)
  if (!isSupabaseConfigured) return <>{children}</>;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppShell: React.FC = () => {
  const { user } = useAuthStore();
  const { loadAll, loadSettings } = useTransactionStore();
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [txnType, setTxnType] = useState<'credit'|'debit'>('credit');

  // Use real user ID or local-mode fallback
  const userId = user?.id || 'local-user';

  useEffect(() => {
    loadSettings(userId).then(() => loadAll(userId));
  }, [userId]);

  // Auto-sync when online (only if authenticated)
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    const doSync = () => syncTransactions(user.id);
    window.addEventListener('online', doSync);
    if (navigator.onLine) doSync();
    return () => window.removeEventListener('online', doSync);
  }, [user]);

  const openAdd = (type: 'credit'|'debit' = 'credit') => { setTxnType(type); setShowTxnForm(true); };

  return (
    <div className="app-wrapper">
      <DuroodBanner />
      <div className="main-layout">
        <Sidebar onAddTransaction={() => openAdd()} />
        <main className="page-content" id="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard onAddTransaction={openAdd} />} />
              <Route path="/ledger"    element={<Ledger />} />
              <Route path="/parties"  element={<Parties />} />
              <Route path="/parties/:partyName" element={<PartyDetail />} />
              <Route path="/reports"  element={<Reports />} />
              <Route path="/import"   element={<Import />} />
              <Route path="/export"   element={<Export />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*"         element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <BottomNav onAddTransaction={() => openAdd()} />
      {showTxnForm && (
        <TransactionForm
          onClose={() => setShowTxnForm(false)}
          defaultType={txnType}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const { initialize, status } = useAuthStore();

  useEffect(() => { initialize(); }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: 'var(--clr-bg-card)', color: 'var(--clr-text-primary)', border: '1px solid var(--clr-border)' },
          success: { iconTheme: { primary: 'var(--clr-green)', secondary: 'white' } },
          error:   { iconTheme: { primary: 'var(--clr-red)',   secondary: 'white' } },
        }}
      />
      {status === 'loading' ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:16, color:'var(--clr-text-muted)' }}>
          <div className="spinner spinner-lg" />
          <p>Loading…</p>
        </div>
      ) : (
        <Routes>
          <Route path="/login"          element={<Login />} />
          <Route path="/reset-password" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          } />
        </Routes>
      )}
    </BrowserRouter>
  );
};

export default App;
