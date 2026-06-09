'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
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
  // 初回サインイン時に customer_profiles / customer_addresses を冪等に初期化済みの user.id を記録。
  // 同一セッション内での重複呼び出しを防ぐ。
  const ensuredProfileUsers = useRef<Set<string>>(new Set());

  const supabase = useMemo(() => createClient(), []);

  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    return !!data;
  };

  useEffect(() => {
    let mounted = true;

    // セッション確定 → 管理者判定 → ローディング解除 の共通処理。
    // 管理者判定は admin_users への別クエリだが、onAuthStateChange のコールバック内で
    // Supabase 呼び出しを直接 await すると supabase-js が navigator.locks でデッドロックし、
    // 以降のクエリが永久にハングする（= 無限ローディングの原因）。
    // 必ず setTimeout(0) でコールバックのロック外に逃がしてから実行する。
    // ref: https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0
    const resolveSession = (session: Session | null) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      const currentUser = session?.user ?? null;
      if (!currentUser) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      setTimeout(async () => {
        let admin = false;
        try {
          admin = await checkAdminStatus(currentUser.id);
        } catch {
          admin = false;
        }
        if (!mounted) return;
        setIsAdmin(admin);
        setIsLoading(false);
      }, 0);
    };

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        resolveSession(session);
      } catch {
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setIsLoading(false);
      }
    };

    getSession();

    // 新規登録の自動ログイン / メール確認リンク経由のログイン / 通常ログインのいずれでも
    // SIGNED_IN が発火する。このタイミングで metadata 由来のプロフィール・デフォルト住所を
    // 冪等に作成する（メール確認が有効でサインアップ直後にセッションが無いケースを確実に救う）。
    const ensureProfile = (currentUser: User) => {
      if (ensuredProfileUsers.current.has(currentUser.id)) return;
      ensuredProfileUsers.current.add(currentUser.id);
      // fetch は HTTP エラーステータス(4xx/5xx)では reject しないため res.ok を明示検査する。
      // 429(レート制限)・500(一時的DBエラー)等で失敗した場合はフラグを戻し、
      // 次回 SIGNED_IN で再試行できるようにする（戻さないと再試行されず住所未作成が恒久化する）。
      fetch('/api/auth/signup', { method: 'POST' })
        .then((res) => {
          if (!res.ok) throw new Error(`ensure profile failed: ${res.status}`);
        })
        .catch(() => {
          ensuredProfileUsers.current.delete(currentUser.id);
        });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        resolveSession(session);
        if (event === 'SIGNED_IN' && session?.user) {
          ensureProfile(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string, name: string, address?: SignUpAddress) => {
    // プロフィール・住所は user_metadata に保持する。メール確認が有効だとサインアップ直後は
    // セッションが無く本人を特定できないため、ここでは DB へ書き込まず、初回セッション確立時
    // （SIGNED_IN）に /api/auth/signup（冪等 ensure）が metadata から作成する。
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          phone: address?.phone ?? '',
          address: address
            ? {
                postalCode: address.postalCode,
                pref: address.pref,
                city: address.city,
                address1: address.address1,
                address2: address.address2 ?? '',
              }
            : null,
        },
      },
    });

    if (error) return { error };

    // 重複サインアップ検知: identities が空なら既存ユーザー
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      return { error: new Error('signup_duplicate') };
    }

    return { error: null };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // 別アカウントで再ログインした際に ensure を再実行できるようリセットする
    ensuredProfileUsers.current.clear();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  }, [supabase]);

  const isCustomer = !!user && !isAdmin;

  const value = useMemo(() => ({
    user,
    session,
    isAdmin,
    isCustomer,
    isLoading,
    signIn,
    signUp,
    signOut,
  }), [user, session, isAdmin, isCustomer, isLoading, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={value}>
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
