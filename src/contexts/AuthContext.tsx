'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface SignUpAddress {
  phone: string;
  postalCode: string;
  pref: string;
  city: string;
  address1: string;
  address2?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isCustomer: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, address?: SignUpAddress) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    return !!data;
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const admin = await checkAdminStatus(session.user.id);
        setIsAdmin(admin);
      }

      setIsLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const admin = await checkAdminStatus(session.user.id);
          setIsAdmin(admin);
        } else {
          setIsAdmin(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string, address?: SignUpAddress) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
      },
    });

    if (error) return { error };

    // 重複サインアップ検知: identities が空なら既存ユーザー
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      return { error: new Error('signup_duplicate') };
    }

    // service_role 経由でプロフィール+住所を保存
    if (data.user) {
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            name,
            phone: address?.phone || '',
            address: address ? {
              postalCode: address.postalCode,
              pref: address.pref,
              city: address.city,
              address1: address.address1,
              address2: address.address2,
            } : undefined,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          console.error('Failed to save profile/address via API:', res.status, body);
        }
      } catch (err) {
        console.error('Signup API call failed:', err);
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  const isCustomer = !!user && !isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isCustomer,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
