'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Button,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { statusLabels } from '@/lib/utils/constants';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price_yen: number;
  line_total_yen: number;
}

interface Shipment {
  id: string;
  tracking_no: string | null;
  shipped_at: string | null;
}

interface Order {
  id: string;
  order_no: string;
  order_type: 'SHIPPING' | 'PICKUP';
  customer_name: string;
  customer_email: string;
  total_yen: number;
  status: string;
  payment_status: string;
  created_at: string;
  order_items: OrderItem[];
  shipments: Shipment[];
}

type TabValue = 'all' | 'shipping';

export default function AdminOrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== 'all') {
        params.set('type', 'SHIPPING');
      }
      const response = await fetch(`/api/admin/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter((order) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      order.order_no.toLowerCase().includes(searchLower) ||
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.customer_email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          注文管理
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={fetchOrders}
          disabled={isLoading}
        >
          更新
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, value) => setTab(value)}>
            <Tab label="すべて" value="all" />
            <Tab label="配送" value="shipping" />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          <TextField
            placeholder="注文番号、顧客名、メールで検索..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>注文番号</TableCell>
                <TableCell>種別</TableCell>
                <TableCell>顧客</TableCell>
                <TableCell>購入商品</TableCell>
                <TableCell align="right">金額</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>発送</TableCell>
                <TableCell>注文日時</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  hover
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {order.order_no}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.order_type === 'SHIPPING' ? '配送' : 'キッチンカー'}
                      size="small"
                      variant="outlined"
                      color={order.order_type === 'SHIPPING' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{order.customer_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {order.customer_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {order.order_items?.map((item, index) => (
                      <Typography key={item.id} variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {item.product_name} × {item.qty}
                        {index < order.order_items.length - 1 && ','}
                      </Typography>
                    ))}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      ¥{formatPrice(order.total_yen)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabels[order.status]?.label || order.status}
                      size="small"
                      color={statusLabels[order.status]?.color || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {order.order_type === 'SHIPPING' ? (
                      order.shipments?.length > 0 && order.shipments[0].shipped_at ? (
                        <Chip label="発送済" size="small" color="success" />
                      ) : (
                        <Chip label="未発送" size="small" variant="outlined" />
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(order.created_at)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">
                      該当する注文がありません
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
