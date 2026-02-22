'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
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
  const t = useTranslations('login');
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
        setError(t('loginFailed'));
        setIsLoading(false);
        return;
      }

      // signIn成功後、明示的にリダイレクト
      router.refresh();
      router.push('/mypage');
    } catch {
      setError(t('loginError'));
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError(t('passwordTooShort'));
      setIsLoading(false);
      return;
    }

    if (!name.trim()) {
      setError(t('nameRequired'));
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, name.trim());

    if (error) {
      setError(t('signupFailed'));
      setIsLoading(false);
      return;
    }

    setSuccess(t('signupSuccess'));
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
              {t('account')}
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
            <Tab label={t('loginTab')} />
            <Tab label={t('signupTab')} />
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
                label={t('email')}
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label={t('password')}
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
                {isLoading ? t('loggingIn') : t('loginButton')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp}>
              <TextField
                label={t('name')}
                fullWidth
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label={t('email')}
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label={t('password')}
                type="password"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText={t('passwordHint')}
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
                {isLoading ? t('signingUp') : t('signupButton')}
              </Button>
            </form>
          )}
        </Paper>
      </Container>
    </Layout>
  );
}
