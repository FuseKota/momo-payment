'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '@/contexts/AuthContext';
import { peachPink } from '@/lib/mui/theme';

/** Supabase の認証エラー（code/status を持つ）を日本語メッセージへ変換する。 */
function loginErrorMessage(error: Error): string {
  const code = (error as { code?: string }).code;
  const status = (error as { status?: number }).status;
  // レート制限（短時間に試行が集中）。資格情報の誤りとは区別する。
  if (status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') {
    return '試行回数が多すぎます。しばらく待ってから再度お試しください。';
  }
  // 資格情報の誤りなど、それ以外は従来文言に倒す（生コードは出さない）。
  return 'ログインに失敗しました。メールアドレスとパスワードを確認してください。';
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, isAdmin, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // AdminShell からセッション切れで戻された場合（?reason=session_expired）の一言案内。
  // useSearchParams は Suspense 境界を要するため、初期化時に window から直接読む。
  const [notice, setNotice] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const reason = new URLSearchParams(window.location.search).get('reason');
    return reason === 'session_expired'
      ? 'セッションの有効期限が切れました。お手数ですが再度ログインしてください。'
      : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in as admin
  useEffect(() => {
    if (!authLoading && isAdmin) {
      router.push('/admin/orders');
    }
  }, [isAdmin, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setNotice(null);

    const { error } = await signIn(email, password);

    if (error) {
      // Supabase の error.code / status でレート制限と資格情報誤りを出し分ける
      setError(loginErrorMessage(error));
      setIsLoading(false);
      return;
    }

    // Auth state change will trigger the redirect via useEffect
    // But we also check here for immediate feedback
    router.push('/admin/orders');
  };

  if (authLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Container maxWidth="xs">
        <Paper sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: peachPink[50],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 30, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              管理者ログイン
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              もも娘 管理画面
            </Typography>
          </Box>

          {notice && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {notice}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="メールアドレス"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="パスワード"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isLoading}
              startIcon={isLoading && <CircularProgress size={20} />}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
