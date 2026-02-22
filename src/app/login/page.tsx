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
  Tabs,
  Tab,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/common';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, user, isAdmin, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        router.push('/admin/orders');
      } else {
        router.push('/mypage');
      }
    }
  }, [user, isAdmin, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
        setIsLoading(false);
        return;
      }

      // signIn成功後、明示的にリダイレクト
      router.refresh();
      router.push('/mypage');
    } catch {
      setError('ログイン処理中にエラーが発生しました。');
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください。');
      setIsLoading(false);
      return;
    }

    if (!name.trim()) {
      setError('お名前を入力してください。');
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, name.trim());

    if (error) {
      setError('登録に失敗しました。別のメールアドレスをお試しください。');
      setIsLoading(false);
      return;
    }

    setSuccess('登録が完了しました。確認メールをご確認ください。');
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: '#FFF0F3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <PersonIcon sx={{ fontSize: 30, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              アカウント
            </Typography>
          </Box>

          <Tabs
            value={tab}
            onChange={(_, v) => {
              setTab(v);
              setError(null);
              setSuccess(null);
            }}
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab label="ログイン" />
            <Tab label="新規登録" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {tab === 0 ? (
            <form onSubmit={handleLogin}>
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
                startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
              >
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp}>
              <TextField
                label="お名前"
                fullWidth
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 2 }}
              />
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
                helperText="6文字以上"
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
              >
                {isLoading ? '登録中...' : '新規登録'}
              </Button>
            </form>
          )}
        </Paper>
      </Container>
    </Layout>
  );
}
