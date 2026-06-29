'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '@/contexts/AuthContext';
import { translateAdminError, adminNetworkErrorMessage } from '@/lib/admin/error-messages';

interface AdminRow {
  user_id: string;
  email: string | null;
  role: string;
  created_at: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const showMessage = (message: string) => setSnackbar({ open: true, message });

  // --- パスワード変更 ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showMessage('現在のパスワードと新しいパスワードを入力してください');
      return;
    }
    if (newPassword.length < 8) {
      showMessage('新しいパスワードは8文字以上で入力してください');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('新しいパスワード（確認）が一致しません');
      return;
    }
    if (currentPassword === newPassword) {
      showMessage('新しいパスワードは現在のパスワードと異なるものにしてください');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/admin/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        showMessage('パスワードを変更しました');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const body = await res.json().catch(() => null);
        showMessage(translateAdminError(body, res.status, 'パスワードの変更に失敗しました'));
      }
    } catch {
      showMessage(adminNetworkErrorMessage());
    } finally {
      setIsChangingPassword(false);
    }
  };

  // --- 管理者一覧 ---
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins ?? []);
      } else {
        const body = await res.json().catch(() => null);
        const message = translateAdminError(body, res.status, '管理者一覧の読み込みに失敗しました');
        setLoadError(message);
        showMessage(message);
      }
    } catch {
      const message = adminNetworkErrorMessage();
      setLoadError(message);
      showMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // --- 管理者追加 ---
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleOpenAddDialog = () => {
    setAddEmail('');
    setAddPassword('');
    setAddDialogOpen(true);
  };

  const handleAddAdmin = async () => {
    if (!addEmail || !addPassword) {
      showMessage('メールアドレスと初期パスワードを入力してください');
      return;
    }
    if (addPassword.length < 8) {
      showMessage('初期パスワードは8文字以上で入力してください');
      return;
    }
    setIsAdding(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail, password: addPassword }),
      });
      if (res.ok) {
        const created: AdminRow = await res.json();
        setAdmins((prev) => [...prev, created]);
        showMessage('管理者を追加しました');
        setAddDialogOpen(false);
      } else {
        const body = await res.json().catch(() => null);
        showMessage(translateAdminError(body, res.status, '管理者の追加に失敗しました'));
      }
    } catch {
      showMessage(adminNetworkErrorMessage());
    } finally {
      setIsAdding(false);
    }
  };

  // --- 管理者削除（権限剥奪） ---
  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/admins/${deleteTarget.user_id}`, { method: 'DELETE' });
      if (res.ok) {
        setAdmins((prev) => prev.filter((a) => a.user_id !== deleteTarget.user_id));
        showMessage('管理者権限を削除しました');
      } else {
        const body = await res.json().catch(() => null);
        showMessage(translateAdminError(body, res.status, '管理者の削除に失敗しました'));
      }
    } catch {
      showMessage(adminNetworkErrorMessage());
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 3 }}>
        設定
      </Typography>

      {/* パスワード変更 */}
      <Paper sx={{ p: 3, mb: 4, maxWidth: 480 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          パスワード変更
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          ログイン中のアカウント（{user?.email ?? '—'}）のパスワードを変更します。
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="現在のパスワード"
            type="password"
            fullWidth
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            label="新しいパスワード（8文字以上）"
            type="password"
            fullWidth
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            label="新しいパスワード（確認）"
            type="password"
            fullWidth
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPassword.length > 0 && newPassword !== confirmPassword}
            helperText={
              confirmPassword.length > 0 && newPassword !== confirmPassword
                ? 'パスワードが一致しません'
                : ' '
            }
          />
          <Box sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {isChangingPassword ? <CircularProgress size={24} /> : 'パスワードを変更'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* 管理者アカウント */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          管理者アカウント
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddDialog}>
          管理者を追加
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>メールアドレス</TableCell>
                <TableCell>登録日</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {admins.map((admin) => {
                const isSelf = admin.user_id === currentUserId;
                return (
                  <TableRow key={admin.user_id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {admin.email ?? '(メール不明)'}
                        </Typography>
                        {isSelf && <Chip label="自分" size="small" color="primary" variant="outlined" />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(admin.created_at)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={isSelf || admins.length <= 1}
                        title={
                          isSelf
                            ? '自分自身は削除できません'
                            : admins.length <= 1
                              ? '最後の1人は削除できません'
                              : '管理者権限を削除'
                        }
                        onClick={() => setDeleteTarget(admin)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {admins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                    {loadError ? (
                      <Stack spacing={1.5} alignItems="center">
                        <Typography color="error">{loadError}</Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<RefreshIcon />}
                          onClick={fetchAdmins}
                        >
                          再読み込み
                        </Button>
                      </Stack>
                    ) : (
                      <Typography color="text.secondary">管理者がいません</Typography>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 管理者追加ダイアログ */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>管理者を追加</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            初期パスワードを設定してアカウントを作成します。作成後すぐにログインできます。初期パスワードは本人に安全な方法で伝えてください。
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="メールアドレス"
              type="email"
              fullWidth
              required
              autoComplete="off"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
            />
            <TextField
              label="初期パスワード（8文字以上）"
              type="password"
              fullWidth
              required
              autoComplete="new-password"
              value={addPassword}
              onChange={(e) => setAddPassword(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setAddDialogOpen(false)} disabled={isAdding}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleAddAdmin}
            disabled={isAdding || !addEmail || addPassword.length < 8}
          >
            {isAdding ? <CircularProgress size={24} /> : '追加'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>管理者権限を削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTarget?.email ?? 'このアカウント'} の管理者権限を削除します。アカウント自体は残りますが、管理画面にはアクセスできなくなります。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
            キャンセル
          </Button>
          <Button color="error" variant="contained" onClick={handleDeleteAdmin} disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={24} /> : '削除'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
