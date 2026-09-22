// src/stores/authStore.ts
import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../sync/supabaseClient';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
  user: User | null;
  session: Session | null;
  status: AuthStatus;
  errorMessage: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  clearError: () => void;
}

const friendlyAuthError = (msg: string): string => {
  if (msg.includes('Invalid login credentials')) return 'Incorrect email or password. Please try again.';
  if (msg.includes('Email not confirmed')) return 'Please confirm your email before signing in.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error. Please check your connection.';
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.';
  return 'An error occurred. Please try again.';
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  status: 'loading',
  errorMessage: null,

  initialize: async () => {
    if (!isSupabaseConfigured || !supabase) {
      // No Supabase configured — bypass auth, go straight to unauthenticated
      set({ status: 'unauthenticated', errorMessage: null });
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        set({ user: session.user, session, status: 'authenticated' });
      } else {
        set({ status: 'unauthenticated' });
      }
      // Listen for auth state changes
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          set({ user: session.user, session, status: 'authenticated', errorMessage: null });
        } else {
          set({ user: null, session: null, status: 'unauthenticated' });
        }
      });
    } catch {
      set({ status: 'unauthenticated' });
    }
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: 'Cloud authentication is not configured.' };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = friendlyAuthError(error.message);
        set({ errorMessage: msg });
        return { error: msg };
      }
      set({ user: data.user, session: data.session, status: 'authenticated', errorMessage: null });
      return { error: null };
    } catch {
      const msg = 'Unable to sign in. Please check your connection.';
      set({ errorMessage: msg });
      return { error: msg };
    }
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null, session: null, status: 'unauthenticated' });
  },

  sendPasswordReset: async (email) => {
    if (!supabase) return { error: 'Cloud authentication is not configured.' };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) return { error: friendlyAuthError(error.message) };
    return { error: null };
  },

  updatePassword: async (newPassword) => {
    if (!supabase) return { error: 'Cloud authentication is not configured.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: friendlyAuthError(error.message) };
    return { error: null };
  },

  clearError: () => set({ errorMessage: null }),
}));
