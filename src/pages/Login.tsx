// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { isSupabaseConfigured } from '../sync/supabaseClient';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, sendPasswordReset, status, errorMessage, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetSent, setResetSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') navigate('/dashboard', { replace: true });
  }, [status, navigate]);

  useEffect(() => { clearError(); }, [mode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim()) { setLocalError('Please enter your email address.'); return; }
    if (!password) { setLocalError('Please enter your password.'); return; }
    if (!isSupabaseConfigured) {
      setLocalError('Cloud authentication is not configured. Please add Supabase credentials to .env file.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (!error) navigate('/dashboard', { replace: true });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim()) { setLocalError('Please enter your email address.'); return; }
    setLoading(true);
    const { error } = await sendPasswordReset(email.trim());
    setLoading(false);
    if (error) { setLocalError(error); }
    else { setResetSent(true); setSuccessMsg('Password reset link sent. Please check your email.'); }
  };

  const displayError = localError || errorMessage;

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-orb login-bg-orb1" />
        <div className="login-bg-orb login-bg-orb2" />
        <div className="login-bg-grid" />
      </div>

      <div className="login-container">
        {/* Logo/Title */}
        <div className="login-brand">
          <div className="login-logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="var(--clr-accent)" />
              <path d="M8 28V12h4l8 12 8-12h4v16h-4V18l-8 11-8-11v10H8z" fill="white" />
            </svg>
          </div>
          <h1 className="login-title">Business Ledger</h1>
          <p className="login-subtitle">Private Financial Record Management</p>
        </div>

        {/* Card */}
        <div className="login-card">
          {mode === 'login' ? (
            <>
              <h2 className="login-card-title">Sign In</h2>
              <p className="login-card-sub">Enter your credentials to access your records</p>

              {!isSupabaseConfigured && (
                <div className="alert alert-warning mt-4" style={{ marginBottom: 16 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Supabase is not configured. Add credentials to .env to enable login.
                </div>
              )}

              {displayError && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  {displayError}
                </div>
              )}

              <form onSubmit={handleSignIn} noValidate>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" htmlFor="login-email">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <div className="password-wrap">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                  <button type="button" className="forgot-link" onClick={() => setMode('forgot')}>
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? <><span className="spinner" />Signing in…</> : 'Sign In'}
                </button>
              </form>
            </>
          ) : (
            <>
              <button className="back-btn" onClick={() => { setMode('login'); setResetSent(false); setSuccessMsg(null); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Sign In
              </button>
              <h2 className="login-card-title" style={{ marginTop: 12 }}>Reset Password</h2>
              <p className="login-card-sub">Enter your email to receive a password reset link</p>

              {displayError && (
                <div className="alert alert-error" style={{ margin: '16px 0' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  {displayError}
                </div>
              )}
              {successMsg && (
                <div className="alert alert-success" style={{ margin: '16px 0' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  {successMsg}
                </div>
              )}

              {!resetSent && (
                <form onSubmit={handleForgotPassword} noValidate>
                  <div className="form-group" style={{ margin: '20px 0' }}>
                    <label className="form-label" htmlFor="reset-email">Email Address</label>
                    <input
                      id="reset-email"
                      type="email"
                      className="form-input"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    {loading ? <><span className="spinner" />Sending…</> : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p className="login-footer">
          Your financial data is private and encrypted.
        </p>
      </div>
    </div>
  );
};

export default Login;
