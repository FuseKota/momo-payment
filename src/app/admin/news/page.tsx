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
  Chip,
  IconButton,
  Button,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { News } from '@/types/database';

interface NewsFormData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  slug: string;
  is_published: boolean;
}

const NEWS_CATEGORIES = ['福島もも娘', '日本国内台湾夜市', '本場台湾夜市', 'お知らせ'] as const;

const defaultFormData: NewsFormData = {
  title: '',
  excerpt: '',
  content: '',
  category: '福島もも娘',
  slug: '',
  is_published: false,
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未公開';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function AdminNewsPage() {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [formData, setFormData] = useState<NewsFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/news');
      if (res.ok) {
        const data = await res.json();
        setNewsList(data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleTogglePublish = async (news: News) => {
    try {
      const res = await fetch(`/api/admin/news/${news.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !news.is_published }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNewsList((prev) => prev.map((n) => (n.id === news.id ? updated : n)));
        setSnackbar({ open: true, message: '公開状態を更新しました' });
      }
    } catch {
      setSnackbar({ open: true, message: '更新に失敗しました' });
    }
  };

  const handleOpenDialog = (news?: News) => {
    if (news) {
      setEditingNews(news);
      setFormData({
        title: news.title,
        excerpt: news.excerpt ?? '',
        content: news.content ?? '',
        category: news.category,
        slug: news.slug,
        is_published: news.is_published,
      });
    } else {
      setEditingNews(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingNews(null);
    setFormData(defaultFormData);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug) {
      setSnackbar({ open: true, message: 'タイトルとスラッグは必須です' });
      return;
    }
    setIsSaving(true);
    try {
      const url = editingNews ? `/api/admin/news/${editingNews.id}` : '/api/admin/news';
      const method = editingNews ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const saved = await res.json();
        if (editingNews) {
          setNewsList((prev) => prev.map((n) => (n.id === editingNews.id ? saved : n)));
        } else {
          setNewsList((prev) => [saved, ...prev]);
        }
        setSnackbar({ open: true, message: editingNews ? '更新しました' : '追加しました' });
        handleCloseDialog();
      } else {
        const err = await res.json();
        setSnackbar({ open: true, message: err.error || '保存に失敗しました' });
      }
    } catch {
      setSnackbar({ open: true, message: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNewsList((prev) => prev.filter((n) => n.id !== id));
        setSnackbar({ open: true, message: '削除しました' });
      }
    } catch {
      setSnackbar({ open: true, message: '削除に失敗しました' });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          ニュース管理
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          記事を追加
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>タイトル</TableCell>
              <TableCell>カテゴリ</TableCell>
              <TableCell>公開日</TableCell>
              <TableCell align="center">公開</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {newsList.map((news) => (
              <TableRow key={news.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {news.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {news.slug}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={news.category} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(news.published_at)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Switch
                    checked={news.is_published}
                    onChange={() => handleTogglePublish(news)}
                    color="primary"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" color="primary" onClick={() => handleOpenDialog(news)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(news.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {newsList.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">ニュースがありません</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit / Add Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingNews ? '記事を編集' : '記事を追加'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                label="タイトル"
                fullWidth
                required
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="スラッグ（URL用）"
                fullWidth
                required
                value={formData.slug}
                onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                placeholder="news-title-2026"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>カテゴリ</InputLabel>
                <Select
                  label="カテゴリ"
                  value={formData.category}
                  onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                >
                  {NEWS_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                label="概要（一覧に表示される短い説明）"
                fullWidth
                multiline
                rows={2}
                value={formData.excerpt}
                onChange={(e) => setFormData((p) => ({ ...p, excerpt: e.target.value }))}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="本文"
                fullWidth
                multiline
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} disabled={isSaving}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !formData.title || !formData.slug}
          >
            {isSaving ? <CircularProgress size={24} /> : editingNews ? '保存' : '追加'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>記事を削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>この操作は元に戻せません。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>キャンセル</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
          >
            削除
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
