'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  const searchParams = useSearchParams();
  const orderNo = searchParams.get('orderNo');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNo) {
      setError('注文番号が見つかりません');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/by-no/${orderNo}`);
        const data = await response.json();

        if (!response.ok || !data.ok) {
          setError('注文情報の取得に失敗しました');
          return;
        }

        setOrder(data.data);
      } catch {
        setError('注文情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNo]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>読み込み中...</Typography>
        </Container>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 4 }}>
            {error || '注文情報が見つかりません'}
          </Alert>
          <Button
            component={Link}
            href="/"
            variant="contained"
            startIcon={<HomeIcon />}
          >
            トップページへ戻る
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
                ? '予約が完了しました'
                : 'ご注文ありがとうございます'
              : isPendingPayment
              ? 'お支払い処理中です'
              : 'ご注文を受け付けました'}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {isPaymentComplete
              ? isPickup
                ? '店頭受取のご予約を承りました。'
                : 'ご注文を承りました。確認メールをお送りしました。'
              : isPendingPayment
              ? 'お支払いが完了次第、確認メールをお送りします。'
              : '注文内容をご確認ください。'}
          </Typography>

          {/* Order Number */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              注文番号
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
              ご注文商品
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
                小計
              </Typography>
              <Typography variant="body2">
                ¥{formatPrice(order.subtotal_yen)}
              </Typography>
            </Box>

            {order.order_type === 'SHIPPING' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  送料
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
                合計
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
                  店頭受取について
                </Typography>
              </Box>
              {order.pickup_date && (
                <Typography variant="body2" sx={{ mb: 2 }}>
                  受取予定: {order.pickup_date}
                  {order.pickup_time && ` ${order.pickup_time}`}
                </Typography>
              )}
              {order.payment_method === 'PAY_AT_PICKUP' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  お支払いは店頭にてお願いいたします。
                </Alert>
              )}
              <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#FFF0F3' }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  もも娘
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  〒150-0001 東京都渋谷区神宮前1-2-3
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  営業時間: 11:00 - 20:00
                </Typography>
              </Paper>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'left', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalShippingIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  配送について
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
                商品は3営業日以内に発送いたします。
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                発送完了後、追跡番号をメールでお知らせいたします。
              </Typography>
              {order.temp_zone === 'FROZEN' && (
                <Typography variant="body2" color="text.secondary">
                  ※冷凍便でお届けします。届き次第冷凍庫での保管をお願いします。
                </Typography>
              )}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </Typography>

            <Button
              component={Link}
              href="/"
              variant="contained"
              size="large"
              startIcon={<HomeIcon />}
              fullWidth
            >
              トップページに戻る
            </Button>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}

export default function CompletePage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>読み込み中...</Typography>
          </Container>
        </Layout>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
