'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Props {
  params: Promise<{ id: string }>;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price_yen: number;
  line_total_yen: number;
}

interface Order {
  id: string;
  order_no: string;
  order_type: 'SHIPPING' | 'PICKUP';
  status: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_postal_code: string | null;
  shipping_prefecture: string | null;
  shipping_city: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  subtotal_yen: number;
  shipping_fee_yen: number;
  total_yen: number;
  tracking_number: string | null;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  fulfilled_at: string | null;
  order_items: OrderItem[];
}

const statusLabels: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  RESERVED: { label: '予約済', color: 'info' },
  PENDING_PAYMENT: { label: '決済待ち', color: 'warning' },
  PAID: { label: '入金済', color: 'success' },
  PACKING: { label: '梱包中', color: 'primary' },
  SHIPPED: { label: '発送済', color: 'secondary' },
  FULFILLED: { label: '完了', color: 'default' },
  CANCELLED: { label: 'キャンセル', color: 'error' },
};

export default function AdminOrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await fetch(`/api/admin/orders/${id}`);
        if (response.ok) {
          const data = await response.json();
          setOrder(data);
          setTrackingNumber(data.tracking_number || '');
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  const updateOrderStatus = async (status: string, extraData?: Record<string, unknown>) => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extraData }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        setOrder({ ...order, ...updatedOrder });
        setSnackbar({ open: true, message: 'ステータスを更新しました', severity: 'success' });
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      setSnackbar({ open: true, message: '更新に失敗しました', severity: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShipped = () => {
    updateOrderStatus('SHIPPED', { tracking_number: trackingNumber });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary">注文が見つかりません</Typography>
        <Button
          component={Link}
          href="/admin/orders"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          注文一覧に戻る
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        component={Link}
        href="/admin/orders"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3 }}
      >
        注文一覧に戻る
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          注文詳細
        </Typography>
        <Chip
          label={statusLabels[order.status]?.label || order.status}
          color={statusLabels[order.status]?.color || 'default'}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Order Info */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              注文情報
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  注文番号
                </Typography>
                <Typography sx={{ fontFamily: 'monospace' }}>
                  {order.order_no}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  種別
                </Typography>
                <Chip
                  label={order.order_type === 'SHIPPING' ? '配送' : 'キッチンカー'}
                  size="small"
                  variant="outlined"
                  color={order.order_type === 'SHIPPING' ? 'primary' : 'secondary'}
                />
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  注文日時
                </Typography>
                <Typography>{formatDate(order.created_at)}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  決済方法
                </Typography>
                <Typography>
                  {order.payment_method === 'PAY_AT_PICKUP' ? '現地払い' : 'オンライン決済'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Customer Info */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              顧客情報
            </Typography>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Typography variant="body2" color="text.secondary">
                  お名前
                </Typography>
                <Typography>{order.customer_name}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  メールアドレス
                </Typography>
                <Typography>{order.customer_email}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  電話番号
                </Typography>
                <Typography>{order.customer_phone || '-'}</Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Shipping Address (for SHIPPING orders) */}
          {order.order_type === 'SHIPPING' && order.shipping_postal_code && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                配送先
              </Typography>
              <Typography variant="body2" color="text.secondary">
                〒{order.shipping_postal_code}
              </Typography>
              <Typography>
                {order.shipping_prefecture}
                {order.shipping_city}
                {order.shipping_address1}
              </Typography>
              {order.shipping_address2 && (
                <Typography>{order.shipping_address2}</Typography>
              )}
            </Paper>
          )}

          {/* Order Items */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              注文商品
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>商品名</TableCell>
                    <TableCell align="right">単価</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell align="right">小計</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.order_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell align="right">¥{formatPrice(item.unit_price_yen)}</TableCell>
                      <TableCell align="right">{item.qty}</TableCell>
                      <TableCell align="right">¥{formatPrice(item.line_total_yen)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Typography color="text.secondary">商品小計</Typography>
                <Typography>¥{formatPrice(order.subtotal_yen)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Typography color="text.secondary">送料</Typography>
                <Typography>¥{formatPrice(order.shipping_fee_yen)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Typography sx={{ fontWeight: 700 }}>合計</Typography>
                <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>
                  ¥{formatPrice(order.total_yen)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Actions Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Payment Status */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PaymentIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6">決済状況</Typography>
            </Box>

            {order.payment_status === 'PAID' ? (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                決済完了: {formatDate(order.paid_at)}
              </Alert>
            ) : (
              <Alert severity="warning">決済待ち</Alert>
            )}
          </Paper>

          {/* Shipping (for SHIPPING orders) */}
          {order.order_type === 'SHIPPING' && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalShippingIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">発送管理</Typography>
              </Box>

              {order.shipped_at ? (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    発送済: {formatDate(order.shipped_at)}
                  </Alert>
                  {order.tracking_number && (
                    <Typography variant="body2">
                      追跡番号: {order.tracking_number}
                    </Typography>
                  )}
                </>
              ) : (
                <>
                  <TextField
                    label="追跡番号"
                    fullWidth
                    size="small"
                    sx={{ mb: 2 }}
                    placeholder="例: 1234-5678-9012"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<LocalShippingIcon />}
                    onClick={handleShipped}
                    disabled={isUpdating || order.payment_status !== 'PAID'}
                  >
                    発送完了にする
                  </Button>
                </>
              )}
            </Paper>
          )}

          {/* Status Update */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              ステータス更新
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {order.status === 'PAID' && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => updateOrderStatus('PACKING')}
                  disabled={isUpdating}
                >
                  梱包中にする
                </Button>
              )}
              {order.status === 'SHIPPED' && (
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => updateOrderStatus('FULFILLED')}
                  disabled={isUpdating}
                >
                  完了にする
                </Button>
              )}
              {order.status !== 'CANCELLED' && order.status !== 'FULFILLED' && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => updateOrderStatus('CANCELLED')}
                  disabled={isUpdating}
                >
                  キャンセル
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
