'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  CircularProgress,
  Snackbar,
  Slider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import EditIcon from '@mui/icons-material/Edit';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatPrice } from '@/lib/utils/format';
import type { Product } from '@/types/database';

interface ProductFormData {
  name: string;
  name_zh_tw: string;
  slug: string;
  kind: 'FROZEN_FOOD' | 'GOODS';
  temp_zone: 'FROZEN' | 'AMBIENT';
  price_yen: number;
  stock_qty: number;
  description: string;
  description_zh_tw: string;
  is_active: boolean;
  image_url: string | null;
}

const defaultFormData: ProductFormData = {
  name: '',
  name_zh_tw: '',
  slug: '',
  kind: 'FROZEN_FOOD',
  temp_zone: 'FROZEN',
  price_yen: 0,
  stock_qty: 0,
  description: '',
  description_zh_tw: '',
  is_active: true,
  image_url: null,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleToggleActive = async (product: Product) => {
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !product.is_active }),
      });

      if (response.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p))
        );
        setSnackbar({ open: true, message: '公開状態を更新しました' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: '更新に失敗しました' });
    }
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        name_zh_tw: product.name_zh_tw || '',
        slug: product.slug,
        kind: product.kind,
        temp_zone: product.temp_zone,
        price_yen: product.price_yen,
        stock_qty: product.stock_qty ?? 0,
        description: product.description || '',
        description_zh_tw: product.description_zh_tw || '',
        is_active: product.is_active,
        image_url: product.image_url,
      });
    } else {
      setEditingProduct(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleFile = async (file: File) => {
    if (!formData.slug) {
      setSnackbar({ open: true, message: 'スラッグを先に入力してください' });
      return;
    }

    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('productSlug', formData.slug);
      if (editingProduct) {
        uploadFormData.append('productId', editingProduct.id);
      }

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (response.ok) {
        const result = await response.json();
        setFormData((prev) => ({ ...prev, image_url: result.url }));
        setSnackbar({ open: true, message: '画像をアップロードしました' });
      } else {
        const error = await response.json();
        setSnackbar({ open: true, message: error.error || 'アップロードに失敗しました' });
      }
    } catch {
      setSnackbar({ open: true, message: 'アップロードに失敗しました' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getCroppedImage = (imageSrc: string, pixelCrop: Area): Promise<File> => {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
        canvas.toBlob((blob) => {
          resolve(new File([blob!], 'cropped.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
      };
      image.src = imageSrc;
    });
  };

  const handleFileSelect = (file: File) => {
    if (!formData.slug) {
      setSnackbar({ open: true, message: 'スラッグを先に入力してください' });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPendingImageSrc(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropDialogOpen(true);
  };

  const handleCropConfirm = async () => {
    if (!pendingImageSrc || !croppedAreaPixels) return;
    const croppedFile = await getCroppedImage(pendingImageSrc, croppedAreaPixels);
    URL.revokeObjectURL(pendingImageSrc);
    setPendingImageSrc(null);
    setCropDialogOpen(false);
    await handleFile(croppedFile);
  };

  const handleCropCancel = () => {
    if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);
    setPendingImageSrc(null);
    setCropDialogOpen(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image_url: null }));
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData(defaultFormData);
  };

  const handleFormChange = (field: keyof ProductFormData, value: string | number | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'kind') {
        updated.temp_zone = value === 'FROZEN_FOOD' ? 'FROZEN' : 'AMBIENT';
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const savedProduct = await response.json();
        if (editingProduct) {
          setProducts((prev) =>
            prev.map((p) => (p.id === editingProduct.id ? savedProduct : p))
          );
        } else {
          setProducts((prev) => [...prev, savedProduct]);
        }
        setSnackbar({ open: true, message: editingProduct ? '商品を更新しました' : '商品を追加しました' });
        handleCloseDialog();
      } else {
        const error = await response.json();
        setSnackbar({ open: true, message: error.error || '保存に失敗しました' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
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
                    {product.image_url ? (
                      <Box
                        component="img"
                        src={product.image_url}
                        alt={product.name}
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
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
                    )}
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
                    onChange={() => handleToggleActive(product)}
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
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    商品がありません
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Add Dialog */}
      <Dialog open={cropDialogOpen} onClose={handleCropCancel} maxWidth="sm" fullWidth>
        <DialogTitle>画像を調整</DialogTitle>
        <DialogContent>
          <Box sx={{ position: 'relative', height: 320, bgcolor: '#000', borderRadius: 1, mt: 1 }}>
            {pendingImageSrc && (
              <Cropper
                image={pendingImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            )}
          </Box>
          <Box sx={{ px: 1, pt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              ズーム
            </Typography>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(_, v) => setZoom(v as number)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCropCancel} disabled={isUploading}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleCropConfirm} disabled={isUploading}>
            {isUploading ? <CircularProgress size={24} /> : '切り取る'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? '商品を編集' : '商品を追加'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Image Upload Section */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                商品画像
              </Typography>
              <Box
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  borderRadius: 2,
                  border: '2px dashed',
                  borderColor: isDragging ? 'primary.main' : 'transparent',
                  backgroundColor: isDragging ? '#FFF0F3' : 'transparent',
                  transition: 'border-color 0.2s, background-color 0.2s',
                }}
              >
                {formData.image_url ? (
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={formData.image_url}
                      alt="商品画像"
                      sx={{
                        width: 120,
                        height: 120,
                        borderRadius: 2,
                        objectFit: 'cover',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: 'error.main',
                        color: 'white',
                        '&:hover': { backgroundColor: 'error.dark' },
                      }}
                      onClick={handleRemoveImage}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: 2,
                      backgroundColor: '#FFF0F3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography sx={{ fontSize: '3rem' }}>
                      {formData.kind === 'FROZEN_FOOD' ? '🍚' : '🎁'}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <Button
                    variant="outlined"
                    startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || !formData.slug}
                  >
                    {isUploading ? 'アップロード中...' : '画像をアップロード'}
                  </Button>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    JPEG, PNG, WebP, GIF (最大5MB)
                  </Typography>
                  {!formData.slug && (
                    <Typography variant="caption" display="block" color="warning.main">
                      ※ スラッグを先に入力してください
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>

            <Grid size={12}>
              <TextField
                label="商品名"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="商品名（繁体字中国語）"
                fullWidth
                value={formData.name_zh_tw}
                onChange={(e) => handleFormChange('name_zh_tw', e.target.value)}
                placeholder="未入力の場合は日本語名が表示されます"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="スラッグ"
                fullWidth
                required
                value={formData.slug}
                onChange={(e) => handleFormChange('slug', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>種別</InputLabel>
                <Select
                  label="種別"
                  value={formData.kind}
                  onChange={(e) => handleFormChange('kind', e.target.value)}
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
                value={formData.price_yen}
                onChange={(e) => handleFormChange('price_yen', parseInt(e.target.value) || 0)}
                InputProps={{ startAdornment: '¥' }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="在庫数"
                type="number"
                fullWidth
                required
                value={formData.stock_qty}
                onChange={(e) => handleFormChange('stock_qty', parseInt(e.target.value) || 0)}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="説明"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="説明（繁体字中国語）"
                fullWidth
                multiline
                rows={3}
                value={formData.description_zh_tw}
                onChange={(e) => handleFormChange('description_zh_tw', e.target.value)}
                placeholder="未入力の場合は日本語の説明が表示されます"
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
            disabled={isSaving || !formData.name || !formData.slug}
          >
            {isSaving ? <CircularProgress size={24} /> : editingProduct ? '保存' : '追加'}
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
