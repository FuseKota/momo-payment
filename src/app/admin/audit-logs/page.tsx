'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import { formatDate } from '@/lib/utils/format';
import type { AuditLog } from '@/types/database';

// アクションの日本語ラベル
const ACTION_LABELS: Record<string, string> = {
  'product.create': '商品作成',
  'product.update': '商品更新',
  'product.delete': '商品削除',
  'product.reorder': '商品並び替え',
  'news.create': 'ニュース作成',
  'news.update': 'ニュース更新',
  'news.delete': 'ニュース削除',
  'order.status_update': '注文ステータス更新',
  'order.mark_paid': '入金確認',
  'order.ship': '発送登録',
  'order.refund': '返金',
  'order.email_resend': 'メール再送',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  product: '商品',
  news: 'ニュース',
  order: '注文',
  calendar: 'カレンダー',
};

const ACTION_OPTIONS = Object.keys(ACTION_LABELS);
const TARGET_TYPE_OPTIONS = Object.keys(TARGET_TYPE_LABELS);

export default function AdminAuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (targetType) params.set('targetType', targetType);
      params.set('page', String(page));
      params.set('perPage', String(perPage));

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items ?? []);
        setTotal(json.total ?? 0);
      } else {
        setSnackbar({ open: true, message: 'ログの取得に失敗しました' });
      }
    } catch {
      setSnackbar({ open: true, message: 'ログの取得に失敗しました' });
    } finally {
      setIsLoading(false);
    }
  }, [action, targetType, page, perPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          監査ログ
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>アクション</InputLabel>
            <Select
              label="アクション"
              value={action}
              onChange={(e) => {
                setPage(0);
                setAction(e.target.value);
              }}
            >
              <MenuItem value="">すべて</MenuItem>
              {ACTION_OPTIONS.map((a) => (
                <MenuItem key={a} value={a}>
                  {ACTION_LABELS[a]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>対象種別</InputLabel>
            <Select
              label="対象種別"
              value={targetType}
              onChange={(e) => {
                setPage(0);
                setTargetType(e.target.value);
              }}
            >
              <MenuItem value="">すべて</MenuItem>
              {TARGET_TYPE_OPTIONS.map((t) => (
                <MenuItem key={t} value={t}>
                  {TARGET_TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
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
                <TableCell>日時</TableCell>
                <TableCell>操作者</TableCell>
                <TableCell>アクション</TableCell>
                <TableCell>対象</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>詳細</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((log) => {
                const metadataStr = JSON.stringify(log.metadata ?? {});
                return (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">{formatDate(log.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{log.actor_email || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ACTION_LABELS[log.action] || log.action}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.target_type
                          ? `${TARGET_TYPE_LABELS[log.target_type] || log.target_type}`
                          : '-'}
                      </Typography>
                      {log.target_id && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {log.target_id}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {log.ip || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Tooltip title={metadataStr}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {metadataStr === '{}' ? '-' : metadataStr}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">記録がありません</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={perPage}
            onRowsPerPageChange={(e) => {
              setPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="表示件数"
          />
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
