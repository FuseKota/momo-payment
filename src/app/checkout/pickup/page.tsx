'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

interface PickupForm {
  name: string;
  email: string;
  phone: string;
  paymentMethod: 'SQUARE' | 'PAY_AT_PICKUP';
  notes: string;
}

const steps = ['お客様情報', 'お支払い'];

export default function PickupCheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PickupForm>({
    name: '',
    email: '',
    phone: '',
    paymentMethod: 'SQUARE',
    notes: '',
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

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
      setError('必須項目を入力してください');
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '予約の作成に失敗しました');
      }

      // Square決済の場合
      if (form.paymentMethod === 'SQUARE' && data.data?.checkoutUrl) {
        clearCart();
        window.location.href = data.data.checkoutUrl;
      } else if (data.data?.orderNo) {
        // 店頭払いの場合
        clearCart();
        router.push(`/complete?orderNo=${data.data.orderNo}`);
      } else {
        throw new Error('注文処理に失敗しました');
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
            href="/pickup"
            variant="contained"
            startIcon={<ArrowBackIcon />}
          >
            キッチンカーメニューに戻る
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
          キッチンカーメニューに戻る
        </Button>

        <Typography variant="h3" sx={{ mb: 4, fontWeight: 700, color: '#1a1a1a' }}>
          キッチンカー予約
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
                <Typography variant="h6">受取情報</Typography>
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

                <Grid size={12}>
                  <TextField
                    label="備考（任意）"
                    fullWidth
                    multiline
                    rows={3}
                    value={form.notes}
                    onChange={handleInputChange('notes')}
                    placeholder="ご要望などあればご記入ください"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleNext}
                >
                  お支払い方法へ進む
                </Button>
              </Box>
            </>
          )}

          {activeStep === 1 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PaymentIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">お支払い方法</Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  お客様情報
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography>{form.name} 様</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {form.email} / {form.phone}
                  </Typography>
                  {form.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      備考: {form.notes}
                    </Typography>
                  )}
                </Paper>
              </Box>

              <FormControl component="fieldset" sx={{ width: '100%', mb: 4 }}>
                <FormLabel component="legend" sx={{ mb: 2 }}>
                  お支払い方法を選択してください
                </FormLabel>
                <RadioGroup
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value as 'SQUARE' | 'PAY_AT_PICKUP',
                    }))
                  }
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 2,
                      cursor: 'pointer',
                      border: form.paymentMethod === 'SQUARE' ? '2px solid' : '1px solid',
                      borderColor: form.paymentMethod === 'SQUARE' ? 'primary.main' : 'divider',
                    }}
                    onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'SQUARE' }))}
                  >
                    <FormControlLabel
                      value="SQUARE"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>
                            オンライン決済（クレジットカード）
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            今すぐSquare決済で支払います
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
                          <Typography sx={{ fontWeight: 600 }}>現地払い（現金）</Typography>
                          <Typography variant="body2" color="text.secondary">
                            受取時に現地でお支払いします
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>
                </RadioGroup>
              </FormControl>

              {form.paymentMethod === 'SQUARE' && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  「予約を確定する」ボタンをクリックすると、Square決済ページに移動します。
                </Alert>
              )}

              {form.paymentMethod === 'PAY_AT_PICKUP' && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  予約確定後、現地でお支払いください。
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                <Button onClick={handleBack}>戻る</Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  startIcon={
                    isLoading ? (
                      <CircularProgress size={20} />
                    ) : form.paymentMethod === 'SQUARE' ? (
                      <PaymentIcon />
                    ) : (
                      <StorefrontIcon />
                    )
                  }
                >
                  {isLoading
                    ? '処理中...'
                    : form.paymentMethod === 'SQUARE'
                    ? '決済ページへ進む'
                    : '予約を確定する'}
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

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  合計
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
