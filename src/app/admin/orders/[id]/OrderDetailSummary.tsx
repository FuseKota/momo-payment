'use client';

import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { formatPrice, formatDate } from '@/lib/utils/format';
import type { Order } from './types';

/** 佐川急便の時間帯コード → 日本語ラベル（管理画面表示用） */
const TIME_SLOT_LABELS: Record<string, string> = {
  UNSPECIFIED: '指定なし',
  AM: '午前中（8:00-12:00）',
  T12_14: '12:00-14:00',
  T14_16: '14:00-16:00',
  T16_18: '16:00-18:00',
  T18_21: '18:00-21:00',
};

/** 注文詳細の左カラム（注文情報・顧客情報・配送先・注文商品）の表示専用コンポーネント */
export default function OrderDetailSummary({ order }: { order: Order }) {
  return (
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
            <Typography sx={{ fontFamily: 'monospace' }}>{order.order_no}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="body2" color="text.secondary">
              種別
            </Typography>
            <Chip label="配送" size="small" variant="outlined" color="primary" />
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
            <Typography>オンライン決済</Typography>
          </Grid>
          {(order.delivery_date ||
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
            <Typography sx={{ wordBreak: 'break-all' }}>{order.customer_email}</Typography>
          </Grid>
          <Grid size={6}>
            <Typography variant="body2" color="text.secondary">
              電話番号
            </Typography>
            <Typography>{order.customer_phone || '-'}</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Shipping Address */}
      {order.shipping_postal_code && (
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
          {order.shipping_address2 && <Typography>{order.shipping_address2}</Typography>}
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
  );
}
