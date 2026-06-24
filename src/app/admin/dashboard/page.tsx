'use client';

import { useRouter } from 'next/navigation';
import { useFetch } from '@/hooks/useFetch';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { statusLabels } from '@/lib/utils/constants';

interface RecentOrder {
  id: string;
  order_no: string;
  status: string;
  total_yen: number;
  customer_name: string;
  created_at: string;
}

interface DashboardData {
  today: { sales: number; count: number };
  month: { sales: number; count: number };
  byStatus: Record<string, number>;
  pending: { toShip: number };
  recentOrders: RecentOrder[];
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: accent ? 'primary.main' : 'text.primary' }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useFetch<DashboardData>('/api/admin/dashboard');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          ダッシュボード
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={refetch}
          disabled={isLoading}
        >
          更新
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !data ? (
        // 取得失敗（isError）でも未取得でも、無限スピナーにせずエラーUI＋更新導線を出す
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={refetch} startIcon={<RefreshIcon />}>
              更新
            </Button>
          }
        >
          {isError
            ? 'ダッシュボードの読み込みに失敗しました。時間をおいて「更新」をお試しください。'
            : 'ダッシュボードのデータを取得できませんでした。「更新」をお試しください。'}
        </Alert>
      ) : (
        <>
          {/* 数値カード */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="本日の売上" value={`¥${formatPrice(data.today.sales)}`} accent />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="本日の注文件数" value={`${data.today.count} 件`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="今月の売上" value={`¥${formatPrice(data.month.sales)}`} accent />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="今月の注文件数" value={`${data.month.count} 件`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard label="要発送" value={`${data.pending.toShip} 件`} />
            </Grid>
          </Grid>

          {/* ステータス別 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  ステータス別
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {Object.entries(data.byStatus).map(([status, count]) => (
                    <Chip
                      key={status}
                      label={`${statusLabels[status]?.label || status}: ${count}`}
                      color={statusLabels[status]?.color || 'default'}
                      size="small"
                    />
                  ))}
                  {Object.keys(data.byStatus).length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      注文がありません
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* 直近注文 */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            直近の注文
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>注文番号</TableCell>
                  <TableCell>顧客</TableCell>
                  <TableCell align="right">金額</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>注文日時</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.recentOrders.map((order) => (
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
                  </TableRow>
                ))}
                {data.recentOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Typography color="text.secondary">注文がありません</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
