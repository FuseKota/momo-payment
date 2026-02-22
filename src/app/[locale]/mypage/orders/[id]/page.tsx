'use client';

import { useState, useEffect, use } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Layout } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { statusLabels } from '@/lib/utils/constants';
import type { OrderWithItems } from '@/types/database';

interface OrderDetailData extends OrderWithItems {
  shipping_addresses?: Array<{
    postal_code: string;
    pref: string;
    city: string;
    address1: string;
    address2: string | null;
    recipient_name: string;
    recipient_phone: string;
  }>;
  shipments?: Array<{
    carrier: string | null;
    tracking_no: string | null;
    shipped_at: string | null;
  }>;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const t = useTranslations('mypage');
  const tc = useTranslations('common');
  const tComplete = useTranslations('complete');
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/mypage/orders/${id}`);
        if (res.status === 404) {
          setError(tc('unexpectedError'));
          return;
        }
        if (!res.ok) throw new Error(tc('unexpectedError'));
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : tc('unexpectedError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [user, id, tc]);

  if (authLoading) {
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
        <Button
          component={Link}
          href="/mypage"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          {t('backToMypage')}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : order ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {t('orderDetail')}
              </Typography>
              <Chip
                label={(statusLabels[order.status] || { label: order.status }).label}
                color={(statusLabels[order.status] || { color: 'default' as const }).color}
              />
            </Box>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">{tComplete('orderNo')}</Typography>
              <Typography variant="h6" sx={{ mb: 2 }}>{order.order_no}</Typography>

              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{t('orderDate')}</Typography>
                  <Typography>{formatDate(order.created_at)}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{t('orderType')}</Typography>
                  <Typography>{order.order_type === 'PICKUP' ? t('orderTypePickup') : t('orderTypeShipping')}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">{t('paymentMethod')}</Typography>
                  <Typography>
                    {order.payment_method === 'PAY_AT_PICKUP' ? t('payAtPickup') : t('creditCard')}
                  </Typography>
                </Box>
              </Box>

              {order.pickup_date && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">{t('pickupDate')}</Typography>
                  <Typography>
                    {order.pickup_date}
                    {order.pickup_time && ` ${order.pickup_time}`}
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* 商品一覧 */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>{t('products')}</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('productName')}</TableCell>
                    <TableCell align="right">{t('unitPrice')}</TableCell>
                    <TableCell align="right">{tc('quantity')}</TableCell>
                    <TableCell align="right">{tc('subtotal')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.order_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.product_name}
                        {item.product_size && ` (${item.product_size})`}
                      </TableCell>
                      <TableCell align="right">¥{formatPrice(item.unit_price_yen)}</TableCell>
                      <TableCell align="right">{item.qty}</TableCell>
                      <TableCell align="right">¥{formatPrice(item.line_total_yen)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography color="text.secondary">{tc('subtotal')}</Typography>
                  <Typography>¥{formatPrice(order.subtotal_yen)}</Typography>
                </Box>
                {order.shipping_fee_yen > 0 && (
                  <Box sx={{ display: 'flex', gap: 4 }}>
                    <Typography color="text.secondary">{tc('shippingFee')}</Typography>
                    <Typography>¥{formatPrice(order.shipping_fee_yen)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{tc('total')}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    ¥{formatPrice(order.total_yen)}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* 配送先 */}
            {order.shipping_addresses && order.shipping_addresses.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>{t('shippingAddress')}</Typography>
                {order.shipping_addresses.map((addr, i) => (
                  <Box key={i}>
                    <Typography>{addr.recipient_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      〒{addr.postal_code}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {addr.pref} {addr.city} {addr.address1}
                      {addr.address2 && ` ${addr.address2}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {addr.recipient_phone}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            )}

            {/* 配送情報 */}
            {order.shipments && order.shipments.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>{t('shippingStatus')}</Typography>
                {order.shipments.map((shipment, i) => (
                  <Box key={i} sx={{ mb: 1 }}>
                    {shipment.carrier && (
                      <Typography variant="body2">{t('carrier', { carrier: shipment.carrier })}</Typography>
                    )}
                    {shipment.tracking_no && (
                      <Typography variant="body2">{t('trackingNo', { trackingNo: shipment.tracking_no })}</Typography>
                    )}
                    {shipment.shipped_at && (
                      <Typography variant="body2" color="text.secondary">
                        {t('shippedAt', { date: formatDate(shipment.shipped_at) })}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Paper>
            )}
          </>
        ) : null}
      </Container>
    </Layout>
  );
}
