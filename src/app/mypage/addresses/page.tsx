'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import { Layout } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomerAddress } from '@/types/database';

interface AddressForm {
  label: string;
  postalCode: string;
  pref: string;
  city: string;
  address1: string;
  address2: string;
  recipientName: string;
  recipientPhone: string;
  isDefault: boolean;
}

const emptyForm: AddressForm = {
  label: '自宅',
  postalCode: '',
  pref: '',
  city: '',
  address1: '',
  address2: '',
  recipientName: '',
  recipientPhone: '',
  isDefault: false,
};

export default function AddressesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch('/api/mypage/addresses');
      if (!res.ok) throw new Error('住所の取得に失敗しました');
      const data = await res.json();
      setAddresses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAddresses();
  }, [user, fetchAddresses]);

  const openNewDialog = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEditDialog = (addr: CustomerAddress) => {
    setForm({
      label: addr.label,
      postalCode: addr.postal_code,
      pref: addr.pref,
      city: addr.city,
      address1: addr.address1,
      address2: addr.address2 || '',
      recipientName: addr.recipient_name,
      recipientPhone: addr.recipient_phone,
      isDefault: addr.is_default,
    });
    setEditingId(addr.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const body = {
        label: form.label,
        postalCode: form.postalCode,
        pref: form.pref,
        city: form.city,
        address1: form.address1,
        address2: form.address2 || undefined,
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        isDefault: form.isDefault,
      };

      const url = editingId ? `/api/mypage/addresses/${editingId}` : '/api/mypage/addresses';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      setDialogOpen(false);
      await fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この住所を削除しますか？')) return;

    try {
      const res = await fetch(`/api/mypage/addresses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      await fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          component={Link}
          href="/mypage"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 3 }}
        >
          マイページに戻る
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            配送先住所
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openNewDialog}
          >
            追加
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : addresses.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              配送先住所が登録されていません
            </Typography>
          </Paper>
        ) : (
          addresses.map((addr) => (
            <Paper key={addr.id} sx={{ p: 3, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {addr.label}
                    </Typography>
                    {addr.is_default && (
                      <Chip
                        icon={<StarIcon />}
                        label="デフォルト"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Typography>{addr.recipient_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    〒{addr.postal_code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {addr.pref} {addr.city} {addr.address1}
                    {addr.address2 && ` ${addr.address2}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {addr.recipient_phone}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => openEditDialog(addr)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(addr.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))
        )}

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingId ? '住所を編集' : '住所を追加'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={12}>
                <TextField
                  label="ラベル"
                  fullWidth
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="自宅、職場など"
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="宛名"
                  fullWidth
                  required
                  value={form.recipientName}
                  onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="電話番号"
                  fullWidth
                  required
                  value={form.recipientPhone}
                  onChange={(e) => setForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                  placeholder="090-1234-5678"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="郵便番号"
                  fullWidth
                  required
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  placeholder="123-4567"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  label="都道府県"
                  fullWidth
                  required
                  value={form.pref}
                  onChange={(e) => setForm((f) => ({ ...f, pref: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="市区町村"
                  fullWidth
                  required
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="番地・建物名"
                  fullWidth
                  required
                  value={form.address1}
                  onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="その他（任意）"
                  fullWidth
                  value={form.address2}
                  onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}
