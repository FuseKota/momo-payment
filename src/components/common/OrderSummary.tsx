'use client';

import { Box, Paper, Typography, Divider } from '@mui/material';
import { formatPrice } from '@/lib/utils/format';

export interface OrderSummaryItem {
  key: string;
  name: string;
  qty: number;
  totalPrice: number;
  /** 商品名の補足（サイズなど） */
  suffix?: string;
}

interface OrderSummaryLabels {
  title: string;
  subtotal: string;
  shippingFee?: string;
  total: string;
  quantity: string;
}

interface OrderSummaryProps {
  items: OrderSummaryItem[];
  subtotal: number;
  shippingFee?: number;
  total: number;
  labels: OrderSummaryLabels;
  showItemDetails?: boolean;
  children?: React.ReactNode;
}

export default function OrderSummary({
  items,
  subtotal,
  shippingFee,
  total,
  labels,
  showItemDetails = true,
  children,
}: OrderSummaryProps) {
  return (
    <Paper sx={{ p: 3, position: 'sticky', top: 100 }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
        {labels.title}
      </Typography>

      {showItemDetails &&
        items.map((item) => (
          <Box
            key={item.key}
            sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}
          >
            <Box>
              <Typography variant="body2">
                {item.name}
                {item.suffix && ` (${item.suffix})`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {labels.quantity} {item.qty}
              </Typography>
            </Box>
            <Typography variant="body2">
              ¥{formatPrice(item.totalPrice)}
            </Typography>
          </Box>
        ))}

      {showItemDetails && <Divider sx={{ my: 2 }} />}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography color="text.secondary">{labels.subtotal}</Typography>
        <Typography>¥{formatPrice(subtotal)}</Typography>
      </Box>

      {shippingFee != null && labels.shippingFee && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography color="text.secondary">{labels.shippingFee}</Typography>
          <Typography>¥{formatPrice(shippingFee)}</Typography>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {labels.total}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          ¥{formatPrice(total)}
        </Typography>
      </Box>

      {children}
    </Paper>
  );
}
