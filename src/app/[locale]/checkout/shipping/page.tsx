'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Divider,
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
import { Layout, PostalCodeField } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils/format';
import { getLocalizedName } from '@/lib/utils/localize-product';
import { SHIPPING_FEE_YEN } from '@/lib/utils/constants';
import type { CustomerAddress } from '@/types/database';

interface ShippingForm {
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
}

export default function ShippingCheckoutPage() {
  const t = useTranslations('checkoutShipping');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [form, setForm] = useState<ShippingForm>({
    name: '',
    email: '',
    phone: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address1: '',
    address2: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ShippingForm, string>>>({});

  const steps = [t('stepAddress'), t('stepPayment')];
  const total = subtotal + SHIPPING_FEE_YEN;

  // ログインユーザーの保存済み住所を取得
  useEffect(() => {
    if (!user) return;

    const fetchAddresses = async () => {
      try {
        const res = await fetch('/api/mypage/addresses');
        if (res.ok) {
          const data = await res.json();
          setSavedAddresses(data);
          // デフォルト住所があれば自動選択
          const defaultAddr = data.find((a: CustomerAddress) => a.is_default);
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            applyAddress(defaultAddr);
          }
        }
      } catch {
        // 住所取得失敗は無視（手動入力で対応可能）
      }
    };

    fetchAddresses();
  }, [user]);

  const applyAddress = (addr: CustomerAddress) => {
    setForm((prev) => ({
      ...prev,
      name: addr.recipient_name,
      phone: addr.recipient_phone,
      postalCode: addr.postal_code,
      prefecture: addr.pref,
      city: addr.city,
      address1: addr.address1,
      address2: addr.address2 || '',
    }));
  };

  const handleAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
    if (addressId === '') return;
    const addr = savedAddresses.find((a) => a.id === addressId);
    if (addr) applyAddress(addr);
  };

  const handleInputChange = (field: keyof ShippingForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ShippingForm, string>> = {};
    const tv = (key: string) => t(`validation.${key}`);

    if (!form.name.trim()) errors.name = tv('nameRequired');
    if (!form.email.trim()) {
      errors.email = tv('emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = tv('emailInvalid');
    }
    if (!form.phone.trim()) {
      errors.phone = tv('phoneRequired');
    } else if (!/^0[0-9\-]{9,13}$/.test(form.phone)) {
      errors.phone = tv('phoneInvalid');
    }
    if (!form.postalCode.trim()) {
      errors.postalCode = tv('postalCodeRequired');
    } else if (!/^\d{3}-?\d{4}$/.test(form.postalCode)) {
      errors.postalCode = tv('postalCodeInvalid');
    }
    if (!form.prefecture.trim()) errors.prefecture = tv('prefectureRequired');
    if (!form.city.trim()) errors.city = tv('cityRequired');
    if (!form.address1.trim()) errors.address1 = tv('address1Required');

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
          customer: {
            name: form.name,
            phone: form.phone,
            email: form.email,
          },
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

      // Redirect to Stripe checkout
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

  if (items.length === 0) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            {t('cartEmpty')}
          </Typography>
          <Button
            component={Link}
            href="/shop"
            variant="contained"
            startIcon={<ArrowBackIcon />}
          >
            {t('backToShop')}
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
          href="/cart"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
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
                    <LocalShippingIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">{t('addressInfo')}</Typography>
                  </Box>

                  {/* 保存済み住所選択 */}
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
                      <TextField
                        label={t('name')}
                        fullWidth
                        required
                        value={form.name}
                        onChange={handleInputChange('name')}
                        error={!!fieldErrors.name}
                        helperText={fieldErrors.name}
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
                        error={!!fieldErrors.email}
                        helperText={fieldErrors.email}
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
                        error={!!fieldErrors.phone}
                        helperText={fieldErrors.phone}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <PostalCodeField
                        value={form.postalCode}
                        onChange={(val) => {
                          setForm((prev) => ({ ...prev, postalCode: val }));
                          if (fieldErrors.postalCode) setFieldErrors((prev) => ({ ...prev, postalCode: undefined }));
                        }}
                        onAddressFound={(result) => {
                          setForm((prev) => ({
                            ...prev,
                            prefecture: result.prefecture,
                            city: result.city + (result.town || ''),
                          }));
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
                        value={form.prefecture}
                        onChange={handleInputChange('prefecture')}
                        error={!!fieldErrors.prefecture}
                        helperText={fieldErrors.prefecture}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label={t('city')}
                        fullWidth
                        required
                        value={form.city}
                        onChange={handleInputChange('city')}
                        error={!!fieldErrors.city}
                        helperText={fieldErrors.city}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label={t('address1')}
                        fullWidth
                        required
                        value={form.address1}
                        onChange={handleInputChange('address1')}
                        error={!!fieldErrors.address1}
                        helperText={fieldErrors.address1}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label={t('address2')}
                        fullWidth
                        value={form.address2}
                        onChange={handleInputChange('address2')}
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
                    <Typography variant="h6">{t('payment')}</Typography>
                  </Box>

                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                      {t('shippingDestination')}
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography>{form.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        〒{form.postalCode}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {form.prefecture} {form.city} {form.address1}
                        {form.address2 && ` ${form.address2}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {form.phone}
                      </Typography>
                    </Paper>
                  </Box>

                  <Alert severity="info" sx={{ mb: 3 }}>
                    {t('paymentNotice')}
                  </Alert>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                    <Button onClick={handleBack}>
                      {tc('back')}
                    </Button>
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

          {/* Order Summary */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, position: 'sticky', top: 100 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                {t('orderSummary')}
              </Typography>

              {items.map((item) => {
                const itemKey = item.variant?.id
                  ? `${item.product.id}:${item.variant.id}`
                  : item.product.id;
                const unitPrice = item.variant?.price_yen ?? item.product.price_yen;

                return (
                  <Box
                    key={itemKey}
                    sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}
                  >
                    <Box>
                      <Typography variant="body2">
                        {getLocalizedName(item.product, locale)}
                        {item.variant?.size && ` (${item.variant.size})`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {tc('quantity')} {item.qty}
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      ¥{formatPrice(unitPrice * item.qty)}
                    </Typography>
                  </Box>
                );
              })}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">{tc('subtotal')}</Typography>
                <Typography>¥{formatPrice(subtotal)}</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">{tc('shippingFee')}</Typography>
                <Typography>¥{formatPrice(SHIPPING_FEE_YEN)}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {tc('total')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  ¥{formatPrice(total)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}
