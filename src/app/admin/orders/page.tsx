'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  IconButton,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Button,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';

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

type TabValue = 'all' | 'shipping' | 'pickup';

export default function AdminOrdersPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== 'all') {
        params.set('type', tab === 'shipping' ? 'SHIPPING' : 'PICKUP');
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

  const formatDate = (dateStr: string) => {
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
            <Tab label="店頭受取" value="pickup" />
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
                <TableCell align="right">金額</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>注文日時</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {order.order_no}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.order_type === 'SHIPPING' ? '配送' : '店頭'}
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
                    <Typography variant="body2">{formatDate(order.created_at)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      component={Link}
                      href={`/admin/orders/${order.id}`}
                      size="small"
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
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
