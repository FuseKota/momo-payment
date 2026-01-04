'use client';

import { useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { mockProducts } from '@/data/mockProducts';

export default function AdminProductsPage() {
  const [products, setProducts] = useState(mockProducts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<typeof mockProducts[0] | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  const handleToggleActive = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, is_active: !p.is_active } : p))
    );
  };

  const handleOpenDialog = (product?: typeof mockProducts[0]) => {
    setEditingProduct(product || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          商品管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          商品を追加
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>商品名</TableCell>
              <TableCell>種別</TableCell>
              <TableCell align="right">価格</TableCell>
              <TableCell align="right">在庫</TableCell>
              <TableCell align="center">公開</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: '#FFF0F3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: '1.5rem' }}>
                        {product.kind === 'FROZEN_FOOD' ? '🍚' : '🎁'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.slug}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {product.temp_zone === 'FROZEN' ? (
                    <Chip
                      icon={<AcUnitIcon />}
                      label="冷凍食品"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    <Chip label="グッズ" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography sx={{ fontWeight: 600 }}>
                    ¥{formatPrice(product.price_yen)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={product.stock_qty ?? 0}
                    size="small"
                    color={(product.stock_qty ?? 0) > 10 ? 'default' : 'warning'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Switch
                    checked={product.is_active}
                    onChange={() => handleToggleActive(product.id)}
                    color="primary"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog(product)}
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? '商品を編集' : '商品を追加'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                label="商品名"
                fullWidth
                required
                defaultValue={editingProduct?.name || ''}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="スラッグ"
                fullWidth
                required
                defaultValue={editingProduct?.slug || ''}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>種別</InputLabel>
                <Select
                  label="種別"
                  defaultValue={editingProduct?.kind || 'FROZEN_FOOD'}
                >
                  <MenuItem value="FROZEN_FOOD">冷凍食品</MenuItem>
                  <MenuItem value="GOODS">グッズ</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="価格（税込）"
                type="number"
                fullWidth
                required
                defaultValue={editingProduct?.price_yen || ''}
                InputProps={{ startAdornment: '¥' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="在庫数"
                type="number"
                fullWidth
                required
                defaultValue={editingProduct?.stock_qty || ''}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="説明"
                fullWidth
                multiline
                rows={3}
                defaultValue={editingProduct?.description || ''}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog}>キャンセル</Button>
          <Button variant="contained" onClick={handleCloseDialog}>
            {editingProduct ? '保存' : '追加'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
