'use client';

import { use } from 'react';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Props {
  params: Promise<{ id: string }>;
}

// Mock order for development
const mockOrder = {
  id: '1',
  orderNo: 'ORD-20240105-001',
  type: 'SHIPPING',
  status: 'PAID',
  paymentStatus: 'PAID',
  paymentMethod: 'SQUARE',
  customer: {
    name: '山田太郎',
    email: 'yamada@example.com',
    phone: '090-1234-5678',
  },
  shipping: {
    postalCode: '150-0001',
    prefecture: '東京都',
    city: '渋谷区',
    address1: '神宮前1-2-3',
    address2: 'サンプルマンション101',
  },
  items: [
    { id: '1', name: '冷凍魯肉飯（2食入）', qty: 2, unitPrice: 1200, subtotal: 2400 },
  ],
  subtotal: 2400,
  shippingFee: 1200,
  total: 3600,
  trackingNumber: null,
  createdAt: '2024-01-05T10:30:00Z',
  paidAt: '2024-01-05T10:35:00Z',
  shippedAt: null,
};

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
  const order = mockOrder; // In production, fetch from API

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
                  {order.orderNo}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  種別
                </Typography>
                <Chip
                  label={order.type === 'SHIPPING' ? '配送' : '店頭受取'}
                  size="small"
                  variant="outlined"
                  color={order.type === 'SHIPPING' ? 'primary' : 'secondary'}
                />
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  注文日時
                </Typography>
                <Typography>{formatDate(order.createdAt)}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  決済方法
                </Typography>
                <Typography>
                  {order.paymentMethod === 'SQUARE' ? 'オンライン決済' : '店頭払い'}
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
                <Typography>{order.customer.name}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  メールアドレス
                </Typography>
                <Typography>{order.customer.email}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary">
                  電話番号
                </Typography>
                <Typography>{order.customer.phone}</Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Shipping Address (for SHIPPING orders) */}
          {order.type === 'SHIPPING' && order.shipping && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                配送先
              </Typography>
              <Typography variant="body2" color="text.secondary">
                〒{order.shipping.postalCode}
              </Typography>
              <Typography>
                {order.shipping.prefecture}
                {order.shipping.city}
                {order.shipping.address1}
              </Typography>
              {order.shipping.address2 && (
                <Typography>{order.shipping.address2}</Typography>
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
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right">¥{formatPrice(item.unitPrice)}</TableCell>
                      <TableCell align="right">{item.qty}</TableCell>
                      <TableCell align="right">¥{formatPrice(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Typography color="text.secondary">商品小計</Typography>
                <Typography>¥{formatPrice(order.subtotal)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Typography color="text.secondary">送料</Typography>
                <Typography>¥{formatPrice(order.shippingFee)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Typography sx={{ fontWeight: 700 }}>合計</Typography>
                <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>
                  ¥{formatPrice(order.total)}
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

            {order.paymentStatus === 'PAID' ? (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                決済完了: {formatDate(order.paidAt)}
              </Alert>
            ) : (
              <Alert severity="warning">決済待ち</Alert>
            )}
          </Paper>

          {/* Shipping (for SHIPPING orders) */}
          {order.type === 'SHIPPING' && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalShippingIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">発送管理</Typography>
              </Box>

              {order.shippedAt ? (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    発送済: {formatDate(order.shippedAt)}
                  </Alert>
                  {order.trackingNumber && (
                    <Typography variant="body2">
                      追跡番号: {order.trackingNumber}
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
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<LocalShippingIcon />}
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
                <Button variant="outlined" color="primary">
                  梱包中にする
                </Button>
              )}
              {order.status === 'SHIPPED' && (
                <Button variant="outlined" color="success">
                  完了にする
                </Button>
              )}
              <Button variant="outlined" color="error">
                キャンセル
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
