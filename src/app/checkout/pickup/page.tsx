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
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PaymentIcon from '@mui/icons-material/Payment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Layout } from '@/components/common';

interface PickupForm {
  name: string;
  email: string;
  phone: string;
  pickupDate: string;
  pickupTime: string;
  paymentMethod: 'SQUARE' | 'CASH';
  notes: string;
}

const steps = ['受取情報', 'お支払い'];

// Generate available pickup dates (next 7 days, excluding past times)
const getAvailableDates = () => {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const pickupTimes = [
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
];

export default function PickupCheckoutPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PickupForm>({
    name: '',
    email: '',
    phone: '',
    pickupDate: '',
    pickupTime: '',
    paymentMethod: 'SQUARE',
    notes: '',
  });

  const availableDates = getAvailableDates();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
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
      'pickupDate',
      'pickupTime',
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
          name: form.name,
          email: form.email,
          phone: form.phone,
          pickupAt: `${form.pickupDate}T${form.pickupTime}:00`,
          paymentMethod: form.paymentMethod,
          notes: form.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '予約の作成に失敗しました');
      }

      if (form.paymentMethod === 'SQUARE' && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        router.push(`/complete?orderNo=${data.orderNo}&type=pickup`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          component={Link}
          href="/pickup"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          受取予約に戻る
        </Button>

        <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>
          店頭受取予約
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
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AccessTimeIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6">受取日時</Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>受取日</InputLabel>
                    <Select
                      value={form.pickupDate}
                      label="受取日"
                      onChange={(e) => setForm((prev) => ({ ...prev, pickupDate: e.target.value }))}
                    >
                      {availableDates.map((date) => (
                        <MenuItem key={date} value={date}>
                          {formatDate(date)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>受取時間</InputLabel>
                    <Select
                      value={form.pickupTime}
                      label="受取時間"
                      onChange={(e) => setForm((prev) => ({ ...prev, pickupTime: e.target.value }))}
                    >
                      {pickupTimes.map((time) => (
                        <MenuItem key={time} value={time}>
                          {time}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                  予約内容
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography>{form.name} 様</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {form.pickupDate && formatDate(form.pickupDate)} {form.pickupTime}
                  </Typography>
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
                      paymentMethod: e.target.value as 'SQUARE' | 'CASH',
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
                      border: form.paymentMethod === 'CASH' ? '2px solid' : '1px solid',
                      borderColor: form.paymentMethod === 'CASH' ? 'primary.main' : 'divider',
                    }}
                    onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'CASH' }))}
                  >
                    <FormControlLabel
                      value="CASH"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>店頭払い（現金）</Typography>
                          <Typography variant="body2" color="text.secondary">
                            受取時に店頭でお支払いします
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

              {form.paymentMethod === 'CASH' && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  予約確定後、店頭でお支払いください。
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

        {/* Store Info */}
        <Paper sx={{ mt: 4, p: 3, backgroundColor: '#FFF0F3' }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
            店舗情報
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            もも娘
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            〒150-0001 東京都渋谷区神宮前1-2-3
          </Typography>
          <Typography variant="body2" color="text.secondary">
            営業時間: 11:00 - 20:00（不定休）
          </Typography>
        </Paper>
      </Container>
    </Layout>
  );
}
