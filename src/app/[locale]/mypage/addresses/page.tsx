'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
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
import { Layout, PostalCodeField } from '@/components/common';
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
  label: '',
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
  const t = useTranslations('addresses');
  const tc = useTranslations('common');
  const tm = useTranslations('mypage');
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
      if (!res.ok) throw new Error(t('fetchError'));
      const data = await res.json();
      setAddresses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  }, [t, tc]);

  useEffect(() => {
    if (user) fetchAddresses();
  }, [user, fetchAddresses]);

  const openNewDialog = () => {
    setForm({ ...emptyForm, label: t('defaultLabel') });
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
        throw new Error(data.error || t('saveFailed'));
      }

      setDialogOpen(false);
      await fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      const res = await fetch(`/api/mypage/addresses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(t('deleteFailed'));
      await fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteFailed'));
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
          {tm('backToMypage')}
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t('title')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openNewDialog}
          >
            {tc('add')}
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
              {t('noAddresses')}
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
                        label={t('default')}
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
          <DialogTitle>{editingId ? t('editTitle') : t('addTitle')}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={12}>
                <TextField
                  label={t('label')}
                  fullWidth
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder={t('labelPlaceholder')}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label={t('recipientName')}
                  fullWidth
                  required
                  value={form.recipientName}
                  onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label={t('phone')}
                  fullWidth
                  required
                  value={form.recipientPhone}
                  onChange={(e) => setForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                  placeholder={t('phonePlaceholder')}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <PostalCodeField
                  value={form.postalCode}
                  onChange={(val) => setForm((f) => ({ ...f, postalCode: val }))}
                  onAddressFound={(result) => {
                    setForm((f) => ({
                      ...f,
                      pref: result.prefecture,
                      city: result.city + (result.town || ''),
                    }));
                  }}
                  label={t('postalCode')}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label={t('prefecture')}
                  fullWidth
                  required
                  value={form.pref}
                  onChange={(e) => setForm((f) => ({ ...f, pref: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label={t('city')}
                  fullWidth
                  required
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label={t('address1')}
                  fullWidth
                  required
                  value={form.address1}
                  onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label={t('address2')}
                  fullWidth
                  value={form.address2}
                  onChange={(e) => setForm((f) => ({ ...f, address2: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? tc('saving') : tc('save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}
