'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import HomeIcon from '@mui/icons-material/Home';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { Layout } from '@/components/common';
import { formatPrice } from '@/lib/utils/format';

interface OrderItem {
  id: string;
  product_name: string;
  qty: number;
  unit_price_yen: number;
  line_total_yen: number;
}

interface ShippingAddress {
  postal_code: string;
  pref: string;
  city: string;
  address1: string;
  address2?: string;
}

interface OrderData {
  id: string;
  order_no: string;
  order_type: 'SHIPPING' | 'PICKUP';
  status: string;
  payment_method: string;
  temp_zone: string | null;
  subtotal_yen: number;
  shipping_fee_yen: number;
  total_yen: number;
  customer_name: string;
  pickup_date?: string;
  pickup_time?: string;
  created_at: string;
  paid_at?: string;
  order_items: OrderItem[];
  shippingAddress?: ShippingAddress;
}

function CompleteContent() {
  const t = useTranslations('complete');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const orderNo = searchParams.get('orderNo');
  const token = searchParams.get('token');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNo) {
      setError(t('orderNoNotFound'));
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const url = token
          ? `/api/orders/by-no/${orderNo}?token=${encodeURIComponent(token)}`
          : `/api/orders/by-no/${orderNo}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.ok) {
          setError(t('fetchError'));
          return;
        }

        setOrder(data.data);
      } catch {
        setError(t('fetchError'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNo, token, t]);

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>{tc('loading')}</Typography>
        </Container>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 4 }}>
            {error || t('orderNotFound')}
          </Alert>
          <Button
            component={Link}
            href="/"
            variant="contained"
            startIcon={<HomeIcon />}
          >
            {t('backToHome')}
          </Button>
        </Container>
      </Layout>
    );
  }

  const isPaymentComplete = order.status === 'PAID' || order.status === 'RESERVED';
  const isPendingPayment = order.status === 'PENDING_PAYMENT';
  const isPickup = order.order_type === 'PICKUP';

  return (
    <Layout>
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          {/* Success Icon */}
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: isPaymentComplete ? '#E8F5E9' : '#FFF3E0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            {isPaymentComplete ? (
              <CheckCircleIcon sx={{ fontSize: 60, color: '#4CAF50' }} />
            ) : (
              <HourglassEmptyIcon sx={{ fontSize: 60, color: '#FF9800' }} />
            )}
          </Box>

          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
            {isPaymentComplete
              ? isPickup
                ? t('reservationComplete')
                : t('orderComplete')
              : isPendingPayment
              ? t('paymentProcessing')
              : t('orderAccepted')}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {isPaymentComplete
              ? isPickup
                ? t('reservationMessage')
                : t('orderConfirmMessage')
              : isPendingPayment
              ? t('pendingPaymentMessage')
              : t('checkOrderMessage')}
          </Typography>

          {/* Order Number */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('orderNo')}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                fontFamily: 'monospace',
              }}
            >
              {order.order_no}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Order Items */}
          <Box sx={{ textAlign: 'left', mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              {t('orderedItems')}
            </Typography>
            {order.order_items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 1,
                }}
              >
                <Box>
                  <Typography variant="body2">{item.product_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ¥{formatPrice(item.unit_price_yen)} × {item.qty}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  ¥{formatPrice(item.line_total_yen)}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {tc('subtotal')}
              </Typography>
              <Typography variant="body2">
                ¥{formatPrice(order.subtotal_yen)}
              </Typography>
            </Box>

            {order.order_type === 'SHIPPING' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {tc('shippingFee')}
                </Typography>
                <Typography variant="body2">
                  ¥{formatPrice(order.shipping_fee_yen)}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mt: 2,
                pt: 2,
                borderTop: '2px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tc('total')}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: 'primary.main' }}
              >
                ¥{formatPrice(order.total_yen)}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Shipping Address or Pickup Info */}
          {isPickup ? (
            <Box sx={{ textAlign: 'left', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StorefrontIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {t('pickupInfoTitle')}
                </Typography>
              </Box>
              {order.payment_method === 'PAY_AT_PICKUP' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {t('payAtPickupNotice')}
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'left', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalShippingIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {t('shippingInfoTitle')}
                </Typography>
              </Box>
              {order.shippingAddress && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                    {order.customer_name} 様
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    〒{order.shippingAddress.postal_code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress.pref}
                    {order.shippingAddress.city}
                    {order.shippingAddress.address1}
                    {order.shippingAddress.address2 &&
                      ` ${order.shippingAddress.address2}`}
                  </Typography>
                </Paper>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('shippingWithinDays')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('trackingNotice')}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('contactNotice')}
            </Typography>

            <Button
              component={Link}
              href="/"
              variant="contained"
              size="large"
              startIcon={<HomeIcon />}
              fullWidth
            >
              {t('backToTop')}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}

export default function CompletePage() {
  const tc = useTranslations('common');

  return (
    <Suspense
      fallback={
        <Layout>
          <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>{tc('loading')}</Typography>
          </Container>
        </Layout>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
