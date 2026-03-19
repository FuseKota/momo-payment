'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import { Layout, PostalCodeField, OrderSummary } from '@/components/common';
import type { OrderSummaryItem } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFormField } from '@/hooks/useFormField';
import { validateCustomerFields, validateAddressFields } from '@/lib/utils/form-validators';
import { getLocalizedName } from '@/lib/utils/localize-product';
import { SHIPPING_FEE_YEN } from '@/lib/utils/constants';
import type { CustomerAddress } from '@/types/database';

export default function ShippingCheckoutPage() {
  const t = useTranslations('checkoutShipping');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user, isLoading: authLoading } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const { form, setForm, fieldErrors, setFieldErrors, handleChange, setValues, clearFieldError } = useFormField({
    name: '',
    email: '',
    phone: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address1: '',
    address2: '',
  });

  const steps = [t('stepAddress'), t('stepPayment')];
  const total = subtotal + SHIPPING_FEE_YEN;

  // 認証ゲート: 未ログインならログインページへリダイレクト
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?callbackUrl=/checkout/shipping' as '/login');
    }
  }, [user, authLoading, router]);

  const applyAddress = useCallback((addr: CustomerAddress) => {
    setValues({
      name: addr.recipient_name,
      phone: addr.recipient_phone,
      postalCode: addr.postal_code,
      prefecture: addr.pref,
      city: addr.city,
      address1: addr.address1,
      address2: addr.address2 || '',
    });
  }, []);

  // ログインユーザーの保存済み住所を取得 + メールプリフィル
  useEffect(() => {
    if (!user) return;

    // メールをプリフィル
    if (user.email) {
      setValues({ email: user.email });
    }

    const fetchAddresses = async () => {
      try {
        const res = await fetch('/api/mypage/addresses');
        if (res.ok) {
          const data = await res.json();
          setSavedAddresses(data);
          const defaultAddr = data.find((a: CustomerAddress) => a.is_default);
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            applyAddress(defaultAddr);
          }
        }
      } catch {
        // 住所取得失敗は無視
      }
    };

    fetchAddresses();
  }, [user, applyAddress]);

  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
    if (addressId === '') return;
    const addr = savedAddresses.find((a) => a.id === addressId);
    if (addr) applyAddress(addr);
  };

  const validateForm = (): boolean => {
    const tv = (key: string) => t(`validation.${key}`);
    const errors: Partial<Record<string, string>> = {
      ...validateCustomerFields(form, tv),
      ...validateAddressFields(form, tv),
    };

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/orders/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: form.name, phone: form.phone, email: form.email },
          address: {
            postalCode: form.postalCode,
            pref: form.prefecture,
            city: form.city,
            address1: form.address1,
            address2: form.address2,
          },
          items: items.map((item) => ({
            productId: item.product.id,
            variantId: item.variant?.id,
            qty: item.qty,
          })),
          agreementAccepted: true,
          locale,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessages: Record<string, string> = {
          temp_zone_mixed: t('errors.tempZoneMixed'),
          product_not_shippable: t('errors.productNotShippable'),
          product_not_found: t('errors.productNotFound'),
          address_required: t('errors.addressRequired'),
          customer_info_required: t('errors.customerInfoRequired'),
          items_required: t('errors.itemsRequired'),
          agreement_required: t('errors.agreementRequired'),
        };
        const message = errorMessages[data.error] || data.error || t('errors.orderCreateFailed');
        throw new Error(message);
      }

      if (data.data?.checkoutUrl) {
        clearCart();
        window.location.href = data.data.checkoutUrl;
      } else {
        throw new Error(t('errors.checkoutUrlFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('unexpectedError'));
      setIsLoading(false);
    }
  };

  // 認証チェック中はローディング表示
  if (authLoading || !user) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2 }}>{t('cartEmpty')}</Typography>
          <Button component={Link} href="/shop" variant="contained" startIcon={<ArrowBackIcon />}>
            {t('backToShop')}
          </Button>
        </Container>
      </Layout>
    );
  }

  const summaryItems: OrderSummaryItem[] = items.map((item) => ({
    key: item.variant?.id ? `${item.product.id}:${item.variant.id}` : item.product.id,
    name: getLocalizedName(item.product, locale),
    suffix: item.variant?.size ?? undefined,
    qty: item.qty,
    totalPrice: (item.variant?.price_yen ?? item.product.price_yen) * item.qty,
  }));

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button component={Link} href="/cart" startIcon={<ArrowBackIcon />} sx={{ mb: 3 }}>
          {t('backToCart')}
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
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 4 }}>
              {activeStep === 0 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <LocalShippingIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">{t('addressInfo')}</Typography>
                  </Box>

                  {savedAddresses.length > 0 && (
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel>{t('selectSavedAddress')}</InputLabel>
                      <Select
                        value={selectedAddressId}
                        label={t('selectSavedAddress')}
                        onChange={(e) => handleAddressSelect(e.target.value)}
                      >
                        <MenuItem value="">{t('manualInput')}</MenuItem>
                        {savedAddresses.map((addr) => (
                          <MenuItem key={addr.id} value={addr.id}>
                            {addr.label} - {addr.recipient_name} ({addr.pref}{addr.city})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <Grid container spacing={3}>
                    <Grid size={12}>
                      <TextField label={t('name')} fullWidth required value={form.name} onChange={handleChange('name')} error={!!fieldErrors.name} helperText={fieldErrors.name} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label={t('email')} type="email" fullWidth required value={form.email} onChange={handleChange('email')} error={!!fieldErrors.email} helperText={fieldErrors.email} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label={t('phone')} fullWidth required value={form.phone} onChange={handleChange('phone')} placeholder={t('phonePlaceholder')} error={!!fieldErrors.phone} helperText={fieldErrors.phone} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <PostalCodeField
                        value={form.postalCode}
                        onChange={(val) => {
                          setForm((prev) => ({ ...prev, postalCode: val }));
                          if (fieldErrors.postalCode) clearFieldError('postalCode');
                        }}
                        onAddressFound={(result) => {
                          setValues({
                            prefecture: result.prefecture,
                            city: result.city + (result.town || ''),
                          });
                          clearFieldError('prefecture');
                          clearFieldError('city');
                        }}
                        label={t('postalCode')}
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField label={t('prefecture')} fullWidth required value={form.prefecture} onChange={handleChange('prefecture')} error={!!fieldErrors.prefecture} helperText={fieldErrors.prefecture} />
                    </Grid>
                    <Grid size={12}>
                      <TextField label={t('city')} fullWidth required value={form.city} onChange={handleChange('city')} error={!!fieldErrors.city} helperText={fieldErrors.city} />
                    </Grid>
                    <Grid size={12}>
                      <TextField label={t('address1')} fullWidth required value={form.address1} onChange={handleChange('address1')} error={!!fieldErrors.address1} helperText={fieldErrors.address1} />
                    </Grid>
                    <Grid size={12}>
                      <TextField label={t('address2')} fullWidth value={form.address2} onChange={handleChange('address2')} />
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" size="large" onClick={handleNext}>
                      {t('proceedToPayment')}
                    </Button>
                  </Box>
                </>
              )}

              {activeStep === 1 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <PaymentIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">{t('payment')}</Typography>
                  </Box>

                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                      {t('shippingDestination')}
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography>{form.name}</Typography>
                      <Typography variant="body2" color="text.secondary">〒{form.postalCode}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {form.prefecture} {form.city} {form.address1}
                        {form.address2 && ` ${form.address2}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">{form.phone}</Typography>
                    </Paper>
                  </Box>

                  <Alert severity="info" sx={{ mb: 3 }}>{t('paymentNotice')}</Alert>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                    <Button onClick={handleBack}>{tc('back')}</Button>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handlePayment}
                      disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} /> : <PaymentIcon />}
                    >
                      {isLoading ? tc('processing') : t('pay')}
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <OrderSummary
              items={summaryItems}
              subtotal={subtotal}
              shippingFee={SHIPPING_FEE_YEN}
              total={total}
              labels={{
                title: t('orderSummary'),
                subtotal: tc('subtotal'),
                shippingFee: tc('shippingFee'),
                total: tc('total'),
                quantity: tc('quantity'),
              }}
            />
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}
