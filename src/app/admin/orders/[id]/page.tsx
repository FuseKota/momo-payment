'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
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
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { statusLabels } from '@/lib/utils/constants';
import { translateAdminError, adminNetworkErrorMessage } from '@/lib/admin/error-messages';
import type { Order } from './types';
import OrderDetailSummary from './OrderDetailSummary';

interface Props {
  params: Promise<{ id: string }>;
}

/** メール再送の種別（顧客向け） */
type ResendEmailType = 'ORDER_CONFIRMATION' | 'PAYMENT_CONFIRMATION' | 'SHIPPING_NOTIFICATION';

const RESEND_EMAIL_LABELS: Record<ResendEmailType, string> = {
  ORDER_CONFIRMATION: '注文確認メール',
  PAYMENT_CONFIRMATION: '支払い確認メール',
  SHIPPING_NOTIFICATION: '発送通知メール',
};

export default function AdminOrderDetailPage({ params }: Props) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 取得失敗時のエラー文言（null=正常 or 404。404 は既存の「注文が見つかりません」表示で扱う）
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('yamato');
  const [isUpdating, setIsUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  // 返金ダイアログ
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  // メール再送
  const [resendType, setResendType] = useState<ResendEmailType>('ORDER_CONFIRMATION');
  const [isResending, setIsResending] = useState(false);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/admin/orders/${id}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
        setTrackingNumber(data.tracking_number || '');
      } else if (response.status === 404) {
        // 404 は「注文が見つかりません」表示で扱う（loadError は立てない）
        setOrder(null);
      } else {
        const body = await response.json().catch(() => null);
        setOrder(null);
        setLoadError(translateAdminError(body, response.status, '注文の読み込みに失敗しました'));
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setOrder(null);
      setLoadError(adminNetworkErrorMessage());
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const updateOrderStatus = async (status: string) => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        setOrder({ ...order, ...updatedOrder });
        setSnackbar({ open: true, message: 'ステータスを更新しました', severity: 'success' });
      } else {
        const body = await response.json().catch(() => null);
        setSnackbar({
          open: true,
          message: translateAdminError(body, response.status, '更新に失敗しました'),
          severity: 'error',
        });
      }
    } catch {
      setSnackbar({ open: true, message: adminNetworkErrorMessage(), severity: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShipped = async () => {
    if (!order) return;
    if (!trackingNumber.trim()) {
      setSnackbar({ open: true, message: '追跡番号を入力してください', severity: 'error' });
      return;
    }
    setIsUpdating(true);
    try {
      // 発送は shipments テーブルへの記録が必要なため専用エンドポイントを使う
      const response = await fetch(`/api/admin/orders/${id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrier, trackingNo: trackingNumber.trim() }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        setOrder({
          ...order,
          status: 'SHIPPED',
          shipped_at: new Date().toISOString(),
          tracking_number: trackingNumber.trim(),
        });
        setSnackbar({ open: true, message: '発送を登録しました', severity: 'success' });
      } else {
        // 業務固有トークンを優先し、未マップ(401/403/429/500等)は translateAdminError で補完する
        let message: string | null = null;
        if (data?.error === 'invalid_status') {
          message = '現在のステータスでは発送登録できません';
        } else if (data?.error === 'not_shipping_order') {
          message = '配送注文ではないため発送登録できません';
        } else if (data?.error === 'validation_error') {
          message = '配送業者と追跡番号を入力してください';
        }
        setSnackbar({
          open: true,
          message: message ?? translateAdminError(data, response.status, '発送登録に失敗しました'),
          severity: 'error',
        });
      }
    } catch {
      setSnackbar({ open: true, message: adminNetworkErrorMessage(), severity: 'error' });
    } finally {
      setIsUpdating(false);
    }
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
        }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        setOrder({ ...order, status: 'REFUNDED', refunded_at: new Date().toISOString() });
        setSnackbar({ open: true, message: '返金処理が完了しました', severity: 'success' });
        setRefundDialogOpen(false);
        setRefundReason('');
      } else {
        // 業務固有トークンを優先し、未マップ(401/403/429/500等)は translateAdminError で補完する
        let message: string | null = null;
        if (data?.error === 'already_refunded') {
          message = 'この注文は既に返金済みです';
        } else if (data?.error === 'stripe_refund_failed') {
          message = 'Stripeでの返金処理に失敗しました。時間をおいて再度お試しください';
        } else if (data?.error === 'no_payment_intent') {
          message = '決済情報が見つからないため返金できません';
        } else if (data?.error === 'unsupported_payment_method') {
          message = 'この決済方法は返金に対応していません';
        }
        setSnackbar({
          open: true,
          message: message ?? translateAdminError(data, response.status, '返金処理に失敗しました'),
          severity: 'error',
        });
      }
    } catch {
      setSnackbar({ open: true, message: adminNetworkErrorMessage(), severity: 'error' });
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
        // 業務固有トークンを優先し、未マップ(401/403/429/500等)は translateAdminError で補完する
        let message: string | null = null;
        if (data?.error === 'no_customer_email') {
          message = 'この注文にはメールアドレスが登録されていません';
        } else if (data?.error === 'invalid_status_for_email') {
          message = '現在のステータスではこのメールを再送できません';
        } else if (data?.error === 'email_send_failed') {
          message = 'メール送信に失敗しました。時間をおいて再度お試しください';
        }
        setSnackbar({
          open: true,
          message: message ?? translateAdminError(data, response.status, 'メールの再送に失敗しました'),
          severity: 'error',
        });
      }
    } catch {
      setSnackbar({ open: true, message: adminNetworkErrorMessage(), severity: 'error' });
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

  if (loadError) {
    return (
      <Box sx={{ py: 4 }}>
        <Button
          component={Link}
          href="/admin/orders"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          注文一覧に戻る
        </Button>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchOrder}
            >
              再読み込み
            </Button>
          }
        >
          {loadError}
        </Alert>
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
        <OrderDetailSummary order={order} />

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
                全額返金（Stripe）
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
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel id="carrier-label">配送業者</InputLabel>
                    <Select
                      labelId="carrier-label"
                      label="配送業者"
                      value={carrier}
                      onChange={(e: SelectChangeEvent) => setCarrier(e.target.value)}
                    >
                      <MenuItem value="yamato">ヤマト運輸</MenuItem>
                      <MenuItem value="sagawa">佐川急便</MenuItem>
                      <MenuItem value="jp_post">日本郵便</MenuItem>
                      <MenuItem value="other">その他</MenuItem>
                    </Select>
                  </FormControl>
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
                    startIcon={isUpdating ? <CircularProgress size={16} /> : <LocalShippingIcon />}
                    onClick={handleShipped}
                    disabled={isUpdating || order.payment_status !== 'PAID' || !trackingNumber.trim()}
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
                  startIcon={isResending ? <CircularProgress size={16} /> : <ReplayIcon />}
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
        <DialogTitle>全額返金の確認</DialogTitle>
        <DialogContent>
          <DialogContentText component="div" sx={{ mb: 2 }}>
            <Box component="span" sx={{ display: 'block' }}>
              注文番号: <strong>{order.order_no}</strong>
            </Box>
            <Box component="span" sx={{ display: 'block' }}>
              返金額: <strong>¥{formatPrice(order.total_yen)}</strong>
            </Box>
          </DialogContentText>

          <Alert severity="warning" sx={{ mb: 2 }}>
            Stripeを通じて全額を返金します。この操作は取り消せません。
          </Alert>

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
            disabled={isRefunding}
            startIcon={isRefunding ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            全額返金する
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
