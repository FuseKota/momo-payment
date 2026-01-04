'use client';

import { useState } from 'react';
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';

// Mock orders for development
const mockOrders = [
  {
    id: '1',
    orderNo: 'ORD-20240105-001',
    type: 'SHIPPING',
    customerName: '山田太郎',
    email: 'yamada@example.com',
    total: 3400,
    status: 'PAID',
    paymentStatus: 'PAID',
    createdAt: '2024-01-05T10:30:00Z',
  },
  {
    id: '2',
    orderNo: 'ORD-20240105-002',
    type: 'PICKUP',
    customerName: '鈴木花子',
    email: 'suzuki@example.com',
    total: 850,
    status: 'RESERVED',
    paymentStatus: 'PENDING',
    createdAt: '2024-01-05T11:00:00Z',
  },
  {
    id: '3',
    orderNo: 'ORD-20240104-003',
    type: 'SHIPPING',
    customerName: '田中一郎',
    email: 'tanaka@example.com',
    total: 5700,
    status: 'SHIPPED',
    paymentStatus: 'PAID',
    createdAt: '2024-01-04T14:20:00Z',
  },
  {
    id: '4',
    orderNo: 'ORD-20240104-004',
    type: 'PICKUP',
    customerName: '佐藤美咲',
    email: 'sato@example.com',
    total: 1700,
    status: 'FULFILLED',
    paymentStatus: 'PAID',
    createdAt: '2024-01-04T09:15:00Z',
  },
];

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

  const filteredOrders = mockOrders.filter((order) => {
    const matchesTab =
      tab === 'all' ||
      (tab === 'shipping' && order.type === 'SHIPPING') ||
      (tab === 'pickup' && order.type === 'PICKUP');

    const matchesSearch =
      !search ||
      order.orderNo.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.email.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          注文管理
        </Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined">
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
                    {order.orderNo}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={order.type === 'SHIPPING' ? '配送' : '店頭'}
                    size="small"
                    variant="outlined"
                    color={order.type === 'SHIPPING' ? 'primary' : 'secondary'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{order.customerName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {order.email}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ¥{formatPrice(order.total)}
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
                  <Typography variant="body2">{formatDate(order.createdAt)}</Typography>
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
    </Box>
  );
}
