'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const signIn = async (email: string, password: string) => {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sign in failed');
    setUser(data.user);
    return data;
  };

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: metadata?.fullName || '' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sign up failed');
    setUser(data.user);
    return data;
  };

  const signOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
  };

  const getCurrentUser = async () => {
    await fetchSession();
    return user;
  };

  const isEmailVerified = () => true; // No email verification needed

  const getUserProfile = async () => {
    if (!user) return null;
    const supabase = createClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    return data;
  };

  // Make user.id compatible with Supabase queries throughout the app
  const session = user ? { user } : null;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      getCurrentUser,
      isEmailVerified,
      getUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
