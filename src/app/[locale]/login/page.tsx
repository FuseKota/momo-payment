'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
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
  Stepper,
  Step,
  StepLabel,
  Grid,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '@/contexts/AuthContext';
import { Layout, PostalCodeField } from '@/components/common';
import { PHONE_REGEX, validateAddressFields } from '@/lib/utils/form-validators';

export default function LoginPage() {
  const t = useTranslations('login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  // // や /\ で始まるプロトコル相対URL・バックスラッシュによるオープンリダイレクトを防ぐ
  const safeCallbackUrl = callbackUrl && /^\/(?![\/\\])/.test(callbackUrl) ? callbackUrl : '/mypage';

  const { signIn, signUp, user, isAdmin, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});

  // サインアップ 2ステップ
  const [signupStep, setSignupStep] = useState(0);
  const [postalCode, setPostalCode] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');

  const signupSteps = [t('stepAccount'), t('stepAddress')];

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        router.push('/admin/orders');
      } else {
        router.push(safeCallbackUrl as '/mypage');
      }
    }
  }, [user, isAdmin, authLoading, router, safeCallbackUrl]);

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

      router.refresh();
      router.push(safeCallbackUrl as '/mypage');
    } catch {
      setError(t('loginError'));
      setIsLoading(false);
    }
  };

  const validateStep0 = (): boolean => {
    const errors: Partial<Record<string, string>> = {};

    if (!name.trim()) errors.name = t('nameRequired');
    if (!email.trim()) errors.email = t('emailRequired');
    if (password.length < 6) errors.password = t('passwordTooShort');
    if (!phone.trim()) {
      errors.phone = t('phoneRequired');
    } else if (!PHONE_REGEX.test(phone)) {
      errors.phone = t('phoneInvalid');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep1 = (): boolean => {
    const errors = validateAddressFields(
      { postalCode, prefecture, city, address1 },
      (key: string) => t(key)
    );
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignupNext = () => {
    if (!validateStep0()) return;
    setError(null);
    setSignupStep(1);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await signUp(email, password, name.trim(), {
      phone,
      postalCode,
      pref: prefecture,
      city,
      address1,
      address2: address2 || undefined,
    });

    if (error) {
      if (error.message === 'signup_duplicate') {
        setError(t('signupDuplicate'));
      } else {
        setError(t('signupFailed'));
      }
      setIsLoading(false);
      return;
    }

    setSuccess(t('signupSuccess'));
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setPostalCode('');
    setPrefecture('');
    setCity('');
    setAddress1('');
    setAddress2('');
    setSignupStep(0);
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
      <Container maxWidth="sm" sx={{ py: 8 }}>
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
              setFieldErrors({});
              setSignupStep(0);
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
            <>
              <Stepper activeStep={signupStep} sx={{ mb: 3 }}>
                {signupSteps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {signupStep === 0 ? (
                <Box>
                  <TextField
                    label={t('name')}
                    fullWidth
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    error={!!fieldErrors.name}
                    helperText={fieldErrors.name}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label={t('email')}
                    type="email"
                    fullWidth
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    error={!!fieldErrors.email}
                    helperText={fieldErrors.email}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label={t('password')}
                    type="password"
                    fullWidth
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    error={!!fieldErrors.password}
                    helperText={fieldErrors.password || t('passwordHint')}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label={t('phone')}
                    fullWidth
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    placeholder={t('phonePlaceholder')}
                    error={!!fieldErrors.phone}
                    helperText={fieldErrors.phone}
                    sx={{ mb: 3 }}
                  />
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleSignupNext}
                  >
                    {t('next')}
                  </Button>
                </Box>
              ) : (
                <form onSubmit={handleSignUp}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <PostalCodeField
                        value={postalCode}
                        onChange={(val) => {
                          setPostalCode(val);
                          if (fieldErrors.postalCode) setFieldErrors((prev) => ({ ...prev, postalCode: undefined }));
                        }}
                        onAddressFound={(result) => {
                          setPrefecture(result.prefecture);
                          setCity(result.city + (result.town || ''));
                          setFieldErrors((prev) => ({ ...prev, prefecture: undefined, city: undefined }));
                        }}
                        label={t('postalCode')}
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label={t('prefecture')}
                        fullWidth
                        required
                        value={prefecture}
                        onChange={(e) => {
                          setPrefecture(e.target.value);
                          if (fieldErrors.prefecture) setFieldErrors((prev) => ({ ...prev, prefecture: undefined }));
                        }}
                        error={!!fieldErrors.prefecture}
                        helperText={fieldErrors.prefecture}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label={t('city')}
                        fullWidth
                        required
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: undefined }));
                        }}
                        error={!!fieldErrors.city}
                        helperText={fieldErrors.city}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label={t('address1')}
                        fullWidth
                        required
                        value={address1}
                        onChange={(e) => {
                          setAddress1(e.target.value);
                          if (fieldErrors.address1) setFieldErrors((prev) => ({ ...prev, address1: undefined }));
                        }}
                        error={!!fieldErrors.address1}
                        helperText={fieldErrors.address1}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label={t('address2')}
                        fullWidth
                        value={address2}
                        onChange={(e) => setAddress2(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button
                      onClick={() => {
                        setSignupStep(0);
                        setFieldErrors({});
                      }}
                    >
                      {t('back')}
                    </Button>
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
                  </Box>
                </form>
              )}
            </>
          )}
        </Paper>
      </Container>
    </Layout>
  );
}
