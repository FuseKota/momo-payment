// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

// Supabase クライアントをモック。onAuthStateChange のコールバックを捕捉して
// SIGNED_IN 等のイベントを任意に発火できるようにする。
const h = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  fromSingle: vi.fn(),
  state: { authCallback: null as null | ((event: string, session: unknown) => void) },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: h.onAuthStateChange,
      getSession: h.getSession,
      signOut: h.signOut,
      signUp: h.signUp,
      signInWithPassword: vi.fn(),
    },
    // checkAdminStatus 用: admin_users.select().eq().single()
    from: () => ({
      select: () => ({ eq: () => ({ single: h.fromSingle }) }),
    }),
  }),
}));

import { AuthProvider, useAuth } from '../AuthContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const userA = {
  id: 'user-a',
  email: 'a@example.com',
  user_metadata: {
    address: { postalCode: '1000001', pref: '東京都', city: '千代田区', address1: '1-1' },
  },
};

const setup = async () => {
  const utils = renderHook(() => useAuth(), { wrapper });
  // 初期 getSession + effect を flush
  await act(async () => {
    await Promise.resolve();
  });
  return utils;
};

const fire = async (event: string, session: unknown) => {
  await act(async () => {
    h.state.authCallback?.(event, session);
    // fetch の .then/.catch（microtask）と resolveSession の setTimeout(admin判定)を flush
    await new Promise((r) => setTimeout(r, 0));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  h.state.authCallback = null;
  h.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
    h.state.authCallback = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  h.getSession.mockResolvedValue({ data: { session: null } });
  h.signOut.mockResolvedValue({});
  h.signUp.mockResolvedValue({ data: { user: { id: 'new', identities: [{}] } }, error: null });
  h.fromSingle.mockResolvedValue({ data: null });
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;
});

describe('AuthContext ensureProfile (SIGNED_IN フロー)', () => {
  it('SIGNED_IN で /api/auth/signup を1回呼ぶ', async () => {
    await setup();
    await fire('SIGNED_IN', { user: userA });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/signup', { method: 'POST' });
  });

  it('同一ユーザーの SIGNED_IN 2回でも fetch は1回（重複防止）', async () => {
    await setup();
    await fire('SIGNED_IN', { user: userA });
    await fire('SIGNED_IN', { user: userA });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('SIGNED_IN 以外のイベント(TOKEN_REFRESHED)では呼ばない', async () => {
    await setup();
    await fire('TOKEN_REFRESHED', { user: userA });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('session.user が無ければ呼ばない', async () => {
    await setup();
    await fire('SIGNED_IN', { user: null });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('HTTPエラー(429)時はフラグを戻し、次回 SIGNED_IN で再試行する', async () => {
    await setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 429 });

    await fire('SIGNED_IN', { user: userA });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // 429 で失敗 → ensuredProfileUsers から除去 → 再試行される
    await fire('SIGNED_IN', { user: userA });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('成功(200)後は同一ユーザーで再試行しないが、signOut でリセットされ再度 ensure する', async () => {
    const { result } = await setup();

    await fire('SIGNED_IN', { user: userA });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.signOut();
    });

    await fire('SIGNED_IN', { user: userA });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('AuthContext signUp 重複検知', () => {
  const doSignUp = async () => {
    const { result } = await setup();
    let res: { error: Error | null } = { error: null };
    await act(async () => {
      res = await result.current.signUp('dup@example.com', 'password1234', 'テスト');
    });
    return res;
  };

  it('メール確認無効: 422 user_already_exists エラーは signup_duplicate に変換', async () => {
    h.signUp.mockResolvedValue({
      data: { user: null },
      error: Object.assign(new Error('User already registered'), {
        code: 'user_already_exists',
        status: 422,
      }),
    });
    const { error } = await doSignUp();
    expect(error?.message).toBe('signup_duplicate');
  });

  it('メール確認無効: "already registered" メッセージでも signup_duplicate に変換', async () => {
    h.signUp.mockResolvedValue({
      data: { user: null },
      error: new Error('User already registered'),
    });
    const { error } = await doSignUp();
    expect(error?.message).toBe('signup_duplicate');
  });

  it('メール確認有効: identities 空のユーザーは signup_duplicate', async () => {
    h.signUp.mockResolvedValue({
      data: { user: { id: 'existing', identities: [] } },
      error: null,
    });
    const { error } = await doSignUp();
    expect(error?.message).toBe('signup_duplicate');
  });

  it('weak_password エラーは変換せずそのまま返す', async () => {
    const weak = Object.assign(new Error('Password is too weak'), { code: 'weak_password' });
    h.signUp.mockResolvedValue({ data: { user: null }, error: weak });
    const { error } = await doSignUp();
    expect(error).toBe(weak);
    expect((error as { code?: string }).code).toBe('weak_password');
  });

  it('正常登録(identities あり)は error なし', async () => {
    h.signUp.mockResolvedValue({
      data: { user: { id: 'new', identities: [{ id: 'x' }] } },
      error: null,
    });
    const { error } = await doSignUp();
    expect(error).toBeNull();
  });
});
