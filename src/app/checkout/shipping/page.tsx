'use client';

import { useState } from 'react';
import Link from 'next/link';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { Layout } from '@/components/common';
import { useCart } from '@/contexts/CartContext';

const SHIPPING_FEE = 1200;

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

const steps = ['配送先入力', 'お支払い'];

export default function ShippingCheckoutPage() {
  const { items, subtotal, getTempZone, clearCart } = useCart();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  const tempZone = getTempZone();
  const total = subtotal + SHIPPING_FEE;

  const handleInputChange = (field: keyof ShippingForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validateForm = (): boolean => {
    const required: (keyof ShippingForm)[] = [
      'name',
      'email',
      'phone',
      'postalCode',
      'prefecture',
      'city',
      'address1',
    ];
    return required.every((field) => form[field].trim() !== '');
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateForm()) {
      setError('必須項目を入力してください');
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
            qty: item.qty,
          })),
          agreementAccepted: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '注文の作成に失敗しました');
      }

      // Redirect to Square payment link
      if (data.data?.checkoutUrl) {
        clearCart();
        window.location.href = data.data.checkoutUrl;
      } else {
        throw new Error('決済URLの取得に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            カートが空です
          </Typography>
          <Button
            component={Link}
            href="/shop"
            variant="contained"
            startIcon={<ArrowBackIcon />}
          >
            商品一覧に戻る
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
          カートに戻る
        </Button>

        <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>
          配送チェックアウト
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
                    <Typography variant="h6">配送先情報</Typography>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid size={12}>
                      <TextField
                        label="お名前"
                        fullWidth
                        required
                        value={form.name}
                        onChange={handleInputChange('name')}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="メールアドレス"
                        type="email"
                        fullWidth
                        required
                        value={form.email}
                        onChange={handleInputChange('email')}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="電話番号"
                        fullWidth
                        required
                        value={form.phone}
                        onChange={handleInputChange('phone')}
                        placeholder="090-1234-5678"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        label="郵便番号"
                        fullWidth
                        required
                        value={form.postalCode}
                        onChange={handleInputChange('postalCode')}
                        placeholder="123-4567"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <TextField
                        label="都道府県"
                        fullWidth
                        required
                        value={form.prefecture}
                        onChange={handleInputChange('prefecture')}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label="市区町村"
                        fullWidth
                        required
                        value={form.city}
                        onChange={handleInputChange('city')}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label="番地・建物名"
                        fullWidth
                        required
                        value={form.address1}
                        onChange={handleInputChange('address1')}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        label="その他（任意）"
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
                      お支払いへ進む
                    </Button>
                  </Box>
                </>
              )}

              {activeStep === 1 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <PaymentIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">お支払い</Typography>
                  </Box>

                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                      配送先
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
                    「決済する」ボタンをクリックすると、Square決済ページに移動します。
                  </Alert>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                    <Button onClick={handleBack}>
                      戻る
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handlePayment}
                      disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} /> : <PaymentIcon />}
                    >
                      {isLoading ? '処理中...' : '決済する'}
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
                注文内容
              </Typography>

              {items.map((item) => (
                <Box
                  key={item.product.id}
                  sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}
                >
                  <Box>
                    <Typography variant="body2">{item.product.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      数量: {item.qty}
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    ¥{formatPrice(item.product.price_yen * item.qty)}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">小計</Typography>
                <Typography>¥{formatPrice(subtotal)}</Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">
                  送料（{tempZone === 'FROZEN' ? '冷凍便' : '常温便'}）
                </Typography>
                <Typography>¥{formatPrice(SHIPPING_FEE)}</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  合計
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  ¥{formatPrice(total)}
                </Typography>
              </Box>

              {tempZone === 'FROZEN' && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: '#FFF0F3',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                >
                  <AcUnitIcon sx={{ color: 'primary.main', fontSize: 18, mt: 0.3 }} />
                  <Typography variant="body2" color="text.secondary">
                    冷凍便でお届けします
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}
