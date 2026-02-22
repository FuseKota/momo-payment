'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
} from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Layout } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { statusLabels } from '@/lib/utils/constants';
import type { OrderWithItems } from '@/types/database';

export default function MyPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/mypage/orders');
        if (!res.ok) throw new Error('注文の取得に失敗しました');
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (authLoading || (!user && !authLoading)) {
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
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
          マイページ
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {user?.email}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button
            component={Link}
            href="/mypage/addresses"
            variant="outlined"
            startIcon={<LocationOnIcon />}
          >
            配送先住所管理
          </Button>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <ShoppingBagIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            注文履歴
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              注文履歴はありません
            </Typography>
            <Button
              component={Link}
              href="/shop"
              variant="contained"
              sx={{ mt: 2 }}
            >
              商品を見る
            </Button>
          </Paper>
        ) : (
          orders.map((order) => {
            const statusInfo = statusLabels[order.status] || { label: order.status, color: 'default' as const };
            return (
              <Paper
                key={order.id}
                component={Link}
                href={`/mypage/orders/${order.id}`}
                sx={{
                  p: 3,
                  mb: 2,
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  '&:hover': { boxShadow: 4 },
                  transition: 'box-shadow 0.2s',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    注文番号: {order.order_no}
                  </Typography>
                  <Chip
                    label={statusInfo.label}
                    color={statusInfo.color}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {formatDate(order.created_at)}
                  {' / '}
                  {order.order_type === 'PICKUP' ? '店頭受け取り' : '配送'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {order.order_items.map((item) => item.product_name).join(', ')}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  合計: ¥{formatPrice(order.total_yen)}
                </Typography>
              </Paper>
            );
          })
        )}
      </Container>
    </Layout>
  );
}
