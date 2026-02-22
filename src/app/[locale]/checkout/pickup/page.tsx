'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Divider,
  Grid,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PaymentIcon from '@mui/icons-material/Payment';
import { Layout } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/utils/format';

interface PickupForm {
  name: string;
  email: string;
  phone: string;
  paymentMethod: 'STRIPE' | 'PAY_AT_PICKUP';
  notes: string;
}

export default function PickupCheckoutPage() {
  const t = useTranslations('checkoutPickup');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PickupForm>({
    name: '',
    email: '',
    phone: '',
    paymentMethod: 'STRIPE',
    notes: '',
  });

  const steps = [t('stepCustomerInfo'), t('stepPayment')];

  const handleInputChange = (field: keyof PickupForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validateForm = (): boolean => {
    const required: (keyof PickupForm)[] = [
      'name',
      'email',
      'phone',
    ];
    return required.every((field) => form[field].trim() !== '');
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateForm()) {
      setError(tc('requiredFieldsError'));
      return;
    }
    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orders/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: form.name,
            phone: form.phone,
            email: form.email,
          },
          items: items.map((item) => ({
            productId: item.product.id,
            qty: item.qty,
          })),
          paymentMethod: form.paymentMethod,
          notes: form.notes,
          agreementAccepted: true,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('reservationFailed'));
      }

      // Stripe決済の場合
      if (form.paymentMethod === 'STRIPE' && data.data?.checkoutUrl) {
        clearCart();
        window.location.href = data.data.checkoutUrl;
      } else if (data.data?.orderNo) {
        // 店頭払いの場合
        clearCart();
        router.push(`/complete?orderNo=${data.data.orderNo}`);
      } else {
        throw new Error(t('orderFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('unexpectedError'));
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            {t('cartEmpty')}
          </Typography>
          <Button
            component={Link}
            href="/pickup"
            variant="contained"
            startIcon={<ArrowBackIcon />}
          >
            {t('backToPickupMenu')}
          </Button>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          component={Link}
          href="/pickup"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          {t('backToMenu')}
        </Button>

        <Typography variant="h3" sx={{ mb: 4, fontWeight: 700, color: '#1a1a1a' }}>
          {t('title')}
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Form Section */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 4 }}>
              {activeStep === 0 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <StorefrontIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">{t('pickupInfo')}</Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid size={12}>
                  <TextField
                    label={t('name')}
                    fullWidth
                    required
                    value={form.name}
                    onChange={handleInputChange('name')}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t('email')}
                    type="email"
                    fullWidth
                    required
                    value={form.email}
                    onChange={handleInputChange('email')}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t('phone')}
                    fullWidth
                    required
                    value={form.phone}
                    onChange={handleInputChange('phone')}
                    placeholder={t('phonePlaceholder')}
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    label={t('notes')}
                    fullWidth
                    multiline
                    rows={3}
                    value={form.notes}
                    onChange={handleInputChange('notes')}
                    placeholder={t('notesPlaceholder')}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleNext}
                >
                  {t('proceedToPayment')}
                </Button>
              </Box>
            </>
          )}

          {activeStep === 1 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PaymentIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">{t('paymentMethod')}</Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  {t('customerInfo')}
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography>{form.name} {t('honorific')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {form.email} / {form.phone}
                  </Typography>
                  {form.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {t('notesLabel')}: {form.notes}
                    </Typography>
                  )}
                </Paper>
              </Box>

              <FormControl component="fieldset" sx={{ width: '100%', mb: 4 }}>
                <FormLabel component="legend" sx={{ mb: 2 }}>
                  {t('selectPaymentMethod')}
                </FormLabel>
                <RadioGroup
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value as 'STRIPE' | 'PAY_AT_PICKUP',
                    }))
                  }
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 2,
                      cursor: 'pointer',
                      border: form.paymentMethod === 'STRIPE' ? '2px solid' : '1px solid',
                      borderColor: form.paymentMethod === 'STRIPE' ? 'primary.main' : 'divider',
                    }}
                    onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'STRIPE' }))}
                  >
                    <FormControlLabel
                      value="STRIPE"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>
                            {t('stripePayment')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('stripeDescription')}
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: form.paymentMethod === 'PAY_AT_PICKUP' ? '2px solid' : '1px solid',
                      borderColor: form.paymentMethod === 'PAY_AT_PICKUP' ? 'primary.main' : 'divider',
                    }}
                    onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'PAY_AT_PICKUP' }))}
                  >
                    <FormControlLabel
                      value="PAY_AT_PICKUP"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>{t('cashPayment')}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('cashDescription')}
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>
                </RadioGroup>
              </FormControl>

              {form.paymentMethod === 'STRIPE' && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  {t('stripeNotice')}
                </Alert>
              )}

              {form.paymentMethod === 'PAY_AT_PICKUP' && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  {t('cashNotice')}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                <Button onClick={handleBack}>{tc('back')}</Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  startIcon={
                    isLoading ? (
                      <CircularProgress size={20} />
                    ) : form.paymentMethod === 'STRIPE' ? (
                      <PaymentIcon />
                    ) : (
                      <StorefrontIcon />
                    )
                  }
                >
                  {isLoading
                    ? tc('processing')
                    : form.paymentMethod === 'STRIPE'
                    ? t('goToPaymentPage')
                    : t('confirmReservation')}
                </Button>
              </Box>
            </>
          )}
            </Paper>
          </Grid>

          {/* Order Summary */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, position: 'sticky', top: 100 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                {t('orderSummary')}
              </Typography>

              {items.map((item) => (
                <Box
                  key={item.product.id}
                  sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}
                >
                  <Box>
                    <Typography variant="body2">{item.product.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tc('quantity')} {item.qty}
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    ¥{formatPrice(item.product.price_yen * item.qty)}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {tc('total')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  ¥{formatPrice(subtotal)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}
