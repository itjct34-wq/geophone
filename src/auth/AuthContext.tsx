import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchProfile, hasPaidAccess, type Profile } from '../services/accessService';
import type { AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  /** Role, plan and paid period of the signed-in user. Null while loading. */
  profile: Profile | null;
  isAdmin: boolean;
  /** True for the admin and for customers whose paid period is running. */
  hasPaid: boolean;
  /** Set when an account was switched off and the person was signed out. */
  notice: string;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves true when a session started, false when email confirmation is pending. */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');

  const applyUser = useCallback(async (u: { id: string; email?: string } | undefined) => {
    if (!u) {
      setUser(null);
      setProfile(null);
      return;
    }
    let p: Profile | null = null;
    try {
      p = await fetchProfile(u.id);
    } catch {
      p = null; // treated as a free customer until the profile can be read
    }
    if (p?.disabled) {
      setNotice('This account has been switched off. Contact the admin.');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      return;
    }
    setNotice('');
    setProfile(p);
    setUser({ id: u.id, email: u.email ?? '' });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      let u = data.session?.user;
      if (u) {
        // A stored session can outlive its account (e.g. a deleted user); verify it with the server
        const { error } = await supabase.auth.getUser();
        if (error) {
          await supabase.auth.signOut();
          u = undefined;
        }
      }
      await applyUser(u);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Run after the callback returns so no database call happens inside it
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setTimeout(() => void applyUser(session?.user), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [applyUser]);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await applyUser(data.user ?? undefined);
  }, [applyUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    setNotice('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message);
    return Boolean(data.session);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      profile,
      isAdmin: profile?.role === 'admin' && !profile.disabled,
      hasPaid: hasPaidAccess(profile),
      notice,
      refreshProfile,
      signIn,
      signUp,
      signOut,
    }),
    [user, ready, profile, notice, refreshProfile, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
