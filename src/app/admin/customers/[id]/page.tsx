'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { statusLabels } from '@/lib/utils/constants';
import { translateAdminError, adminNetworkErrorMessage } from '@/lib/admin/error-messages';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import type { CustomerAddress } from '@/types/database';

interface Props {
  params: Promise<{ id: string }>;
}

interface CustomerProfileDetail {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerOrderRow {
  id: string;
  order_no: string;
  order_type: string;
  status: string;
  total_yen: number;
  created_at: string;
  paid_at: string | null;
}

interface CustomerDetail {
  user_id: string;
  profile: CustomerProfileDetail;
  email: string | null;
  addresses: CustomerAddress[];
  orders: CustomerOrderRow[];
}

/** 定義ラベル付きの1項目（プロフィール表示用） */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value || '-'}</Typography>
    </Box>
  );
}

export default function AdminCustomerDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 取得失敗時のエラー文言（null=正常 or 404。404 は「顧客が見つかりません」で扱う）
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchCustomer = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/admin/customers/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
      } else if (response.status === 404) {
        setCustomer(null);
      } else {
        const body = await response.json().catch(() => null);
        setCustomer(null);
        setLoadError(translateAdminError(body, response.status, '顧客情報の読み込みに失敗しました'));
      }
    } catch (error) {
      secureLog('error', 'Failed to fetch customer', safeErrorLog(error));
      setCustomer(null);
      setLoadError(adminNetworkErrorMessage());
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box>
        <Button component={Link} href="/admin/customers" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          顧客マスタへ戻る
        </Button>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={fetchCustomer}>
              再読み込み
            </Button>
          }
        >
          {loadError}
        </Alert>
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box>
        <Button component={Link} href="/admin/customers" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          顧客マスタへ戻る
        </Button>
        <Alert severity="warning">顧客が見つかりません。</Alert>
      </Box>
    );
  }

  const { profile, email, addresses, orders } = customer;

  return (
    <Box>
      <Button component={Link} href="/admin/customers" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        顧客マスタへ戻る
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>
        {profile.display_name || '（未設定）'}
      </Typography>

      {/* プロフィール */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          プロフィール
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label="氏名" value={profile.display_name} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label="メール" value={email} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label="電話番号" value={profile.phone} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Field label="登録日" value={formatDate(profile.created_at)} />
          </Grid>
        </Grid>
      </Paper>

      {/* 保存住所 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          保存済み住所（{addresses.length}件）
        </Typography>
        {addresses.length === 0 ? (
          <Typography color="text.secondary">登録された住所はありません。</Typography>
        ) : (
          <Stackable addresses={addresses} />
        )}
      </Paper>

      {/* 注文履歴 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          注文履歴（{orders.length}件）
        </Typography>
        {orders.length === 0 ? (
          <Typography color="text.secondary">注文はありません。</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>注文番号</TableCell>
                  <TableCell>注文日時</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell align="right">金額</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((o) => (
                  <TableRow
                    key={o.id}
                    hover
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {o.order_no}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(o.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusLabels[o.status]?.label || o.status}
                        size="small"
                        color={statusLabels[o.status]?.color || 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ¥{formatPrice(o.total_yen)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

/** 保存住所のカード一覧 */
function Stackable({ addresses }: { addresses: CustomerAddress[] }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {addresses.map((a, index) => (
        <Box key={a.id}>
          {index > 0 && <Divider sx={{ mb: 2 }} />}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {a.label}
            </Typography>
            {a.is_default && <Chip label="デフォルト" size="small" color="primary" />}
          </Box>
          <Typography variant="body2">
            〒{a.postal_code} {a.pref}
            {a.city}
            {a.address1}
            {a.address2 ? ` ${a.address2}` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {a.recipient_name}（{a.recipient_phone}）
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
