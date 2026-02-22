'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('mypage');
  const tc = useTranslations('common');
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
        if (!res.ok) throw new Error(tc('unexpectedError'));
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : tc('unexpectedError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user, tc]);

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
          {t('title')}
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
            {t('addressManagement')}
          </Button>
        </Box>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <ShoppingBagIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {t('orderHistory')}
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
              {t('noOrders')}
            </Typography>
            <Button
              component={Link}
              href="/shop"
              variant="contained"
              sx={{ mt: 2 }}
            >
              {t('viewProducts')}
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
                    {t('orderNo', { orderNo: order.order_no })}
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
                  {order.order_type === 'PICKUP' ? t('orderTypePickup') : t('orderTypeShipping')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {order.order_items.map((item) => item.product_name).join(', ')}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {tc('total')}: ¥{formatPrice(order.total_yen)}
                </Typography>
              </Paper>
            );
          })
        )}
      </Container>
    </Layout>
  );
}
