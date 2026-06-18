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
  TablePagination,
  Chip,
  TextField,
  InputAdornment,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { statusLabels } from '@/lib/utils/constants';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

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
  customer_name: string;
  customer_email: string;
  total_yen: number;
  status: string;
  payment_status: string;
  created_at: string;
  order_items: OrderItem[];
  shipments: Shipment[];
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 検索入力の debounce（300ms）。サーバーフィルタに渡す値のみ遅延させる。
  // 検索語が変わったら先頭ページへ戻す（debounce 後にまとめて反映）。
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ステータス・期間の変更ハンドラ（変更時は先頭ページへ戻す）
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(0);
  };
  const handleFromChange = (value: string) => {
    setFrom(value);
    setPage(0);
  };
  const handleToChange = (value: string) => {
    setTo(value);
    setPage(0);
  };

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    const q = debouncedSearch.trim();
    if (q) {
      params.set('q', q);
    }
    if (from) {
      params.set('from', from);
    }
    if (to) {
      params.set('to', to);
    }
    return params;
  }, [statusFilter, debouncedSearch, from, to]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = buildFilterParams();
      params.set('limit', String(rowsPerPage));
      params.set('offset', String(page * rowsPerPage));
      const response = await fetch(`/api/admin/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (error) {
      secureLog('error', 'Failed to fetch orders', safeErrorLog(error));
    } finally {
      setIsLoading(false);
    }
  }, [buildFilterParams, page, rowsPerPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleExport = () => {
    const params = buildFilterParams();
    window.location.assign(`/api/admin/orders/export?${params}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          注文管理
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            onClick={handleExport}
          >
            CSV出力
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={fetchOrders}
            disabled={isLoading}
          >
            更新
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
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
            <TextField
              select
              label="ステータス"
              size="small"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              sx={{ width: 180 }}
            >
              <MenuItem value="">すべて</MenuItem>
              {Object.entries(statusLabels).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label="開始日"
              size="small"
              value={from}
              onChange={(e) => handleFromChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 170 }}
            />
            <TextField
              type="date"
              label="終了日"
              size="small"
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 170 }}
            />
          </Stack>
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
                <TableCell>顧客</TableCell>
                <TableCell>購入商品</TableCell>
                <TableCell align="right">金額</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>発送</TableCell>
                <TableCell>注文日時</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
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
                    {order.shipments?.length > 0 && order.shipments[0].shipped_at ? (
                      <Chip label="発送済" size="small" color="success" />
                    ) : (
                      <Chip label="未発送" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(order.created_at)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
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
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[20, 50, 100]}
            labelRowsPerPage="表示件数"
          />
        </TableContainer>
      )}
    </Box>
  );
}
