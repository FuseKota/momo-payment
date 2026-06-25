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
  TextField,
  InputAdornment,
  Button,
  CircularProgress,
  Stack,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { translateAdminError, adminNetworkErrorMessage } from '@/lib/admin/error-messages';
import type { AdminCustomerListItem } from '@/types/database';

export default function AdminCustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [customers, setCustomers] = useState<AdminCustomerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 一覧取得失敗時のエラー文言（null=正常 / 空状態と区別する）
  const [loadError, setLoadError] = useState<string | null>(null);

  // 検索入力の debounce（300ms）。サーバーフィルタに渡す値のみ遅延させる。
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      const q = debouncedSearch.trim();
      if (q) {
        params.set('q', q);
      }
      params.set('limit', String(rowsPerPage));
      params.set('offset', String(page * rowsPerPage));
      const response = await fetch(`/api/admin/customers?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers ?? []);
        setTotal(data.total ?? 0);
      } else {
        const body = await response.json().catch(() => null);
        setCustomers([]);
        setTotal(0);
        setLoadError(translateAdminError(body, response.status, '顧客一覧を取得できませんでした'));
      }
    } catch (error) {
      secureLog('error', 'Failed to fetch customers', safeErrorLog(error));
      setCustomers([]);
      setTotal(0);
      setLoadError(adminNetworkErrorMessage());
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page, rowsPerPage]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          顧客マスタ
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={fetchCustomers}
          disabled={isLoading}
        >
          更新
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField
              placeholder="氏名、メール、電話で検索..."
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 320 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Box>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : loadError ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchCustomers}
            >
              再読み込み
            </Button>
          }
        >
          {loadError}
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>氏名</TableCell>
                <TableCell>メール</TableCell>
                <TableCell>電話番号</TableCell>
                <TableCell>登録日</TableCell>
                <TableCell align="right">注文数</TableCell>
                <TableCell align="right">累計購入額</TableCell>
                <TableCell>最終注文日</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((c) => (
                <TableRow
                  key={c.user_id}
                  hover
                  onClick={() => router.push(`/admin/customers/${c.user_id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant="body2">{c.display_name || '（未設定）'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {c.email || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{c.phone || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(c.registered_at)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{c.order_count}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      ¥{formatPrice(c.total_spent_yen)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {c.last_order_at ? formatDate(c.last_order_at) : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">該当する顧客がありません</Typography>
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
