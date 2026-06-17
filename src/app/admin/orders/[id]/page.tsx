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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import ReplayIcon from '@mui/icons-material/Replay';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { statusLabels } from '@/lib/utils/constants';

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
  delivery_date: string | null;
  delivery_time_slot: string | null;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  shipped_at: string | null;
  fulfilled_at: string | null;
  order_items: OrderItem[];
  payments?: Array<{
    id: string;
    provider: string;
    status: string;
    amount_yen: number;
    stripe_payment_intent_id: string | null;
    refunded_at: string | null;
    stripe_refund_id: string | null;
  }>;
}

/** メール再送の種別（顧客向け） */
type ResendEmailType = 'ORDER_CONFIRMATION' | 'PAYMENT_CONFIRMATION' | 'SHIPPING_NOTIFICATION';

const RESEND_EMAIL_LABELS: Record<ResendEmailType, string> = {
  ORDER_CONFIRMATION: '注文確認メール',
  PAYMENT_CONFIRMATION: '支払い確認メール',
  SHIPPING_NOTIFICATION: '発送通知メール',
};

/** 佐川急便の時間帯コード → 日本語ラベル（管理画面表示用） */
const TIME_SLOT_LABELS: Record<string, string> = {
  UNSPECIFIED: '指定なし',
  AM: '午前中（8:00-12:00）',
  T12_14: '12:00-14:00',
  T14_16: '14:00-16:00',
  T16_18: '16:00-18:00',
  T18_21: '18:00-21:00',
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
  // 返金ダイアログ
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundCashConfirmed, setRefundCashConfirmed] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  // メール再送
  const [resendType, setResendType] = useState<ResendEmailType>('ORDER_CONFIRMATION');
  const [isResending, setIsResending] = useState(false);

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

  const handleRefund = async () => {
    if (!order) return;
    setIsRefunding(true);
    try {
      const response = await fetch(`/api/admin/orders/${id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: refundReason || undefined,
          manualMark: refundCashConfirmed || undefined,
        }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        setOrder({ ...order, status: 'REFUNDED', refunded_at: new Date().toISOString() });
        setSnackbar({ open: true, message: '返金処理が完了しました', severity: 'success' });
        setRefundDialogOpen(false);
        setRefundReason('');
        setRefundCashConfirmed(false);
      } else {
        let message = '返金処理に失敗しました';
        if (data?.error === 'already_refunded') {
          message = 'この注文は既に返金済みです';
        } else if (data?.error === 'stripe_refund_failed') {
          message = 'Stripeでの返金処理に失敗しました。時間をおいて再度お試しください';
        } else if (data?.error === 'no_payment_intent') {
          message = '決済情報が見つからないため返金できません';
        } else if (data?.error === 'manual_mark_required') {
          message = '現金返金の確認にチェックを入れてください';
        } else if (data?.error === 'unsupported_payment_method') {
          message = 'この決済方法は返金に対応していません';
        }
        setSnackbar({ open: true, message, severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, message: '返金処理に失敗しました', severity: 'error' });
    } finally {
      setIsRefunding(false);
    }
  };

  const handleResendEmail = async () => {
    if (!order) return;
    setIsResending(true);
    try {
      const response = await fetch(`/api/admin/orders/${id}/resend-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: resendType }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        setSnackbar({ open: true, message: 'メールを再送しました', severity: 'success' });
      } else {
        let message = 'メールの再送に失敗しました';
        if (data?.error === 'no_customer_email') {
          message = 'この注文にはメールアドレスが登録されていません';
        } else if (data?.error === 'invalid_status_for_email') {
          message = '現在のステータスではこのメールを再送できません';
        } else if (data?.error === 'email_send_failed') {
          message = 'メール送信に失敗しました。時間をおいて再度お試しください';
        }
        setSnackbar({ open: true, message, severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, message: 'メールの再送に失敗しました', severity: 'error' });
    } finally {
      setIsResending(false);
    }
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

  // 返金関連の派生値
  const isStripe = order.payment_method !== 'PAY_AT_PICKUP';
  const isRefunded = order.status === 'REFUNDED' || !!order.refunded_at;
  const canRefund = !isRefunded && ['PAID', 'PACKING', 'SHIPPED', 'FULFILLED'].includes(order.status);

  // 現在のステータスで再送可能なメール種別
  const availableResendTypes: ResendEmailType[] = (() => {
    const types: ResendEmailType[] = ['ORDER_CONFIRMATION'];
    if (['PAID', 'PACKING', 'SHIPPED', 'FULFILLED'].includes(order.status)) {
      types.push('PAYMENT_CONFIRMATION');
    }
    if (order.order_type === 'SHIPPING' && ['SHIPPED', 'FULFILLED'].includes(order.status)) {
      types.push('SHIPPING_NOTIFICATION');
    }
    return types;
  })();
  const effectiveResendType = availableResendTypes.includes(resendType)
    ? resendType
    : availableResendTypes[0];

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
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
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
              {order.order_type === 'SHIPPING' &&
                (order.delivery_date ||
                  (order.delivery_time_slot && order.delivery_time_slot !== 'UNSPECIFIED')) && (
                  <Grid size={12}>
                    <Typography variant="body2" color="text.secondary">
                      お届け希望日時
                    </Typography>
                    <Typography>
                      {order.delivery_date || '指定なし'}
                      {order.delivery_time_slot &&
                        order.delivery_time_slot !== 'UNSPECIFIED' &&
                        ` / ${TIME_SLOT_LABELS[order.delivery_time_slot] ?? order.delivery_time_slot}`}
                    </Typography>
                  </Grid>
                )}
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

            {isRefunded && (
              <Alert severity="info" sx={{ mt: 2 }}>
                返金済み{order.refunded_at ? `: ${formatDate(order.refunded_at)}` : ''}
              </Alert>
            )}

            {canRefund && (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => setRefundDialogOpen(true)}
                disabled={isRefunding}
              >
                {isStripe ? '全額返金（Stripe）' : '返金済みにする'}
              </Button>
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
              {order.status !== 'CANCELED' && order.status !== 'FULFILLED' && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => updateOrderStatus('CANCELED')}
                  disabled={isUpdating}
                >
                  キャンセル
                </Button>
              )}
            </Box>
          </Paper>

          {/* Email Resend */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EmailIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6">メール再送</Typography>
            </Box>
            {order.customer_email ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="resend-email-type-label">メール種別</InputLabel>
                  <Select
                    labelId="resend-email-type-label"
                    label="メール種別"
                    value={effectiveResendType}
                    onChange={(e: SelectChangeEvent) =>
                      setResendType(e.target.value as ResendEmailType)
                    }
                  >
                    {availableResendTypes.map((t) => (
                      <MenuItem key={t} value={t}>
                        {RESEND_EMAIL_LABELS[t]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<ReplayIcon />}
                  onClick={handleResendEmail}
                  disabled={isResending}
                >
                  再送する
                </Button>
              </Box>
            ) : (
              <Alert severity="warning">
                メールアドレスが登録されていないため再送できません
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Refund Confirmation Dialog */}
      <Dialog
        open={refundDialogOpen}
        onClose={() => (isRefunding ? undefined : setRefundDialogOpen(false))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{isStripe ? '全額返金の確認' : '返金済みにする'}</DialogTitle>
        <DialogContent>
          <DialogContentText component="div" sx={{ mb: 2 }}>
            <Box component="span" sx={{ display: 'block' }}>
              注文番号: <strong>{order.order_no}</strong>
            </Box>
            <Box component="span" sx={{ display: 'block' }}>
              返金額: <strong>¥{formatPrice(order.total_yen)}</strong>
            </Box>
          </DialogContentText>

          {isStripe ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Stripeを通じて全額を返金します。この操作は取り消せません。
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              店頭現金払いのため、Stripeでの返金は行われません。現金での返金が完了したことを確認のうえチェックしてください。
            </Alert>
          )}

          {!isStripe && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={refundCashConfirmed}
                  onChange={(e) => setRefundCashConfirmed(e.target.checked)}
                />
              }
              label="現金での返金が完了したことを確認しました"
            />
          )}

          <TextField
            label="返金理由（任意・管理用メモ）"
            fullWidth
            multiline
            minRows={2}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialogOpen(false)} disabled={isRefunding}>
            キャンセル
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleRefund}
            disabled={isRefunding || (!isStripe && !refundCashConfirmed)}
          >
            {isStripe ? '全額返金する' : '返金済みにする'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
