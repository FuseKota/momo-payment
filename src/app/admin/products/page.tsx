'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Switch,
  FormControlLabel,
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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import SortIcon from '@mui/icons-material/Sort';
import SaveIcon from '@mui/icons-material/Save';
import type { Product, FoodLabel } from '@/types/database';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { peachPink } from '@/lib/mui/theme';
import ProductTable from './ProductTable';

interface ProductFormData {
  name: string;
  name_zh_tw: string;
  name_en: string;
  slug: string;
  kind: 'FROZEN_FOOD' | 'GOODS';
  temp_zone: 'FROZEN' | 'AMBIENT';
  price_yen: number;
  description: string;
  description_zh_tw: string;
  description_en: string;
  is_active: boolean;
  can_ship: boolean;
  image_url: string | null;
  stock_qty: number | null;
  food_label: FoodLabel | null;
  food_label_zh_tw: FoodLabel | null;
}

const defaultFormData: ProductFormData = {
  name: '',
  name_zh_tw: '',
  name_en: '',
  slug: '',
  kind: 'FROZEN_FOOD',
  temp_zone: 'FROZEN',
  price_yen: 0,
  description: '',
  description_zh_tw: '',
  description_en: '',
  is_active: true,
  can_ship: true,
  image_url: null,
  stock_qty: null,
  food_label: null,
  food_label_zh_tw: null,
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [orderedProducts, setOrderedProducts] = useState<Product[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      secureLog('error', 'Failed to fetch products', safeErrorLog(error));
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
        name_en: product.name_en || '',
        slug: product.slug,
        kind: product.kind,
        temp_zone: product.temp_zone,
        price_yen: product.price_yen,
        description: product.description || '',
        description_zh_tw: product.description_zh_tw || '',
        description_en: product.description_en || '',
        is_active: product.is_active,
        can_ship: product.can_ship,
        image_url: product.image_url,
        stock_qty: product.stock_qty,
        food_label: product.food_label,
        food_label_zh_tw: product.food_label_zh_tw,
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
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Failed to create blob')); return; }
          resolve(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
      };
      image.onerror = () => reject(new Error('Failed to load image'));
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

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setSnackbar({ open: true, message: '商品を削除しました' });
      } else {
        setSnackbar({ open: true, message: '削除に失敗しました（注文履歴に含まれている商品は削除できません）' });
      }
    } catch {
      setSnackbar({ open: true, message: '削除に失敗しました' });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleStartReorder = () => {
    setOrderedProducts([...products]);
    setIsReorderMode(true);
  };

  const handleCancelReorder = () => {
    setOrderedProducts([]);
    setIsReorderMode(false);
  };

  const handleMoveProduct = (index: number, direction: 'up' | 'down') => {
    const newList = [...orderedProducts];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setOrderedProducts(newList);
  };

  const handleSaveReorder = async () => {
    setIsReordering(true);
    try {
      const payload = {
        items: orderedProducts.map((p, index) => ({
          id: p.id,
          sort_order: index,
        })),
      };
      const response = await fetch('/api/admin/products/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setProducts(orderedProducts);
        setOrderedProducts([]);
        setIsReorderMode(false);
        setSnackbar({ open: true, message: '並び順を保存しました' });
      } else {
        setSnackbar({ open: true, message: '保存に失敗しました' });
      }
    } catch {
      setSnackbar({ open: true, message: '保存に失敗しました' });
    } finally {
      setIsReordering(false);
    }
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

  const numericFoodLabelFields = ['net_weight_grams'] as const;
  const nutritionFields = ['calories', 'protein', 'fat', 'carbohydrates', 'sodium'] as const;
  type NutritionField = (typeof nutritionFields)[number];

  const handleFoodLabelChange = (
    locale: 'ja' | 'zh_tw',
    field: keyof FoodLabel | `nutrition.${NutritionField}`,
    value: string
  ) => {
    const key = locale === 'ja' ? 'food_label' : 'food_label_zh_tw';
    setFormData((prev) => {
      const current: FoodLabel = { ...(prev[key] ?? {}) };

      if (field.startsWith('nutrition.')) {
        const nutritionKey = field.slice('nutrition.'.length) as NutritionField;
        const nextNutrition = { ...(current.nutrition ?? {}) };
        if (value === '') {
          delete nextNutrition[nutritionKey];
        } else {
          const parsed = nutritionKey === 'calories' ? parseInt(value, 10) : parseFloat(value);
          if (!Number.isNaN(parsed)) {
            nextNutrition[nutritionKey] = parsed;
          }
        }
        if (Object.keys(nextNutrition).length === 0) {
          delete current.nutrition;
        } else {
          current.nutrition = nextNutrition;
        }
      } else if ((numericFoodLabelFields as readonly string[]).includes(field)) {
        const numericKey = field as 'net_weight_grams';
        if (value === '') {
          delete current[numericKey];
        } else {
          const parsed = parseInt(value, 10);
          if (!Number.isNaN(parsed)) {
            current[numericKey] = parsed;
          }
        }
      } else {
        const stringKey = field as 'ingredients' | 'allergens' | 'expiry_info' | 'storage_method' | 'manufacturer';
        if (value === '') {
          delete current[stringKey];
        } else {
          current[stringKey] = value;
        }
      }

      return { ...prev, [key]: current };
    });
  };

  const normalizeFoodLabel = (label: FoodLabel | null): FoodLabel | null => {
    if (!label) return null;
    const { nutrition, ...rest } = label;
    const hasNutrition = nutrition && Object.keys(nutrition).length > 0;
    const hasRest = Object.values(rest).some(
      (v) => v !== undefined && v !== null && v !== ''
    );
    if (!hasNutrition && !hasRest) return null;
    return label;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const normalizedStockQty =
        formData.stock_qty === null || Number.isNaN(formData.stock_qty)
          ? null
          : formData.stock_qty;

      const payload = {
        ...formData,
        stock_qty: normalizedStockQty,
        food_label: normalizeFoodLabel(formData.food_label),
        food_label_zh_tw: normalizeFoodLabel(formData.food_label_zh_tw),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            商品管理
          </Typography>
          {isReorderMode && (
            <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
              並び替えモード
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isReorderMode ? (
            <>
              <Button variant="outlined" onClick={handleCancelReorder} disabled={isReordering}>
                キャンセル
              </Button>
              <Button
                variant="contained"
                startIcon={isReordering ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={handleSaveReorder}
                disabled={isReordering}
              >
                並び順を保存
              </Button>
            </>
          ) : (
            <>
              <Button variant="outlined" startIcon={<SortIcon />} onClick={handleStartReorder}>
                並び替え
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                商品を追加
              </Button>
            </>
          )}
        </Box>
      </Box>

      <ProductTable
        products={products}
        orderedProducts={orderedProducts}
        isReorderMode={isReorderMode}
        onMove={handleMoveProduct}
        onToggleActive={handleToggleActive}
        onEdit={handleOpenDialog}
        onDelete={setDeleteConfirmId}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>商品を削除しますか？</DialogTitle>
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
                  backgroundColor: isDragging ? peachPink[50] : 'transparent',
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
                      backgroundColor: peachPink[50],
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
            <Grid size={12}>
              <TextField
                label="商品名（英語）"
                fullWidth
                value={formData.name_en}
                onChange={(e) => handleFormChange('name_en', e.target.value)}
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
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                販売設定
              </Typography>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.can_ship}
                      onChange={(e) => handleFormChange('can_ship', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="配送EC（オンライン販売）"
                />
              </Box>
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
                value={formData.stock_qty ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    stock_qty: e.target.value === '' ? null : parseInt(e.target.value, 10),
                  }))
                }
                helperText="空欄=在庫管理しない（無制限）／0=売り切れ"
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
            <Grid size={12}>
              <TextField
                label="説明（英語）"
                fullWidth
                multiline
                rows={3}
                value={formData.description_en}
                onChange={(e) => handleFormChange('description_en', e.target.value)}
                placeholder="未入力の場合は日本語の説明が表示されます"
              />
            </Grid>

            {formData.kind === 'FROZEN_FOOD' && (
              <>
                {/* 食品表示ラベル（日本語） */}
                <Grid size={12}>
                  <Typography variant="subtitle2" sx={{ mt: 2 }}>
                    食品表示ラベル（冷凍食品）
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="原材料名"
                    fullWidth
                    multiline
                    rows={2}
                    value={formData.food_label?.ingredients ?? ''}
                    onChange={(e) => handleFoodLabelChange('ja', 'ingredients', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="アレルゲン"
                    fullWidth
                    value={formData.food_label?.allergens ?? ''}
                    onChange={(e) => handleFoodLabelChange('ja', 'allergens', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="内容量（g）"
                    type="number"
                    fullWidth
                    value={formData.food_label?.net_weight_grams ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('ja', 'net_weight_grams', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="賞味期限"
                    fullWidth
                    value={formData.food_label?.expiry_info ?? ''}
                    onChange={(e) => handleFoodLabelChange('ja', 'expiry_info', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="保存方法"
                    fullWidth
                    value={formData.food_label?.storage_method ?? ''}
                    onChange={(e) => handleFoodLabelChange('ja', 'storage_method', e.target.value)}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="製造者"
                    fullWidth
                    value={formData.food_label?.manufacturer ?? ''}
                    onChange={(e) => handleFoodLabelChange('ja', 'manufacturer', e.target.value)}
                  />
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">
                    栄養成分（1食あたり）
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <TextField
                    label="熱量（kcal）"
                    type="number"
                    fullWidth
                    value={formData.food_label?.nutrition?.calories ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('ja', 'nutrition.calories', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <TextField
                    label="たんぱく質（g）"
                    type="number"
                    fullWidth
                    value={formData.food_label?.nutrition?.protein ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('ja', 'nutrition.protein', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <TextField
                    label="脂質（g）"
                    type="number"
                    fullWidth
                    value={formData.food_label?.nutrition?.fat ?? ''}
                    onChange={(e) => handleFoodLabelChange('ja', 'nutrition.fat', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <TextField
                    label="炭水化物（g）"
                    type="number"
                    fullWidth
                    value={formData.food_label?.nutrition?.carbohydrates ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('ja', 'nutrition.carbohydrates', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <TextField
                    label="食塩相当量（mg）"
                    type="number"
                    fullWidth
                    value={formData.food_label?.nutrition?.sodium ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('ja', 'nutrition.sodium', e.target.value)
                    }
                    helperText="栄養成分の食塩相当量（sodium）は mg で入力"
                  />
                </Grid>

                {/* 食品表示ラベル（繁体字中文） */}
                <Grid size={12}>
                  <Typography variant="subtitle2" sx={{ mt: 2 }}>
                    食品表示ラベル（繁体字中文）
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="原材料名"
                    fullWidth
                    multiline
                    rows={2}
                    value={formData.food_label_zh_tw?.ingredients ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('zh_tw', 'ingredients', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="アレルゲン"
                    fullWidth
                    value={formData.food_label_zh_tw?.allergens ?? ''}
                    onChange={(e) => handleFoodLabelChange('zh_tw', 'allergens', e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="内容量（g）"
                    type="number"
                    fullWidth
                    value={formData.food_label_zh_tw?.net_weight_grams ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('zh_tw', 'net_weight_grams', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="賞味期限"
                    fullWidth
                    value={formData.food_label_zh_tw?.expiry_info ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('zh_tw', 'expiry_info', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="保存方法"
                    fullWidth
                    value={formData.food_label_zh_tw?.storage_method ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('zh_tw', 'storage_method', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="製造者"
                    fullWidth
                    value={formData.food_label_zh_tw?.manufacturer ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('zh_tw', 'manufacturer', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary">
                    栄養成分（1食あたり）
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <TextField
                    label="熱量（kcal）"
                    type="number"
                    fullWidth
                    value={formData.food_label_zh_tw?.nutrition?.calories ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('zh_tw', 'nutrition.calories', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <TextField
                    label="たんぱく質（g）"
                    type="number"
                    fullWidth
                    value={formData.food_label_zh_tw?.nutrition?.protein ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('zh_tw', 'nutrition.protein', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <TextField
                    label="脂質（g）"
                    type="number"
                    fullWidth
                    value={formData.food_label_zh_tw?.nutrition?.fat ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('zh_tw', 'nutrition.fat', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <TextField
                    label="炭水化物（g）"
                    type="number"
                    fullWidth
                    value={formData.food_label_zh_tw?.nutrition?.carbohydrates ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('zh_tw', 'nutrition.carbohydrates', e.target.value)
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <TextField
                    label="食塩相当量（mg）"
                    type="number"
                    fullWidth
                    value={formData.food_label_zh_tw?.nutrition?.sodium ?? ''}
                    onChange={(e) =>
                      handleFoodLabelChange('zh_tw', 'nutrition.sodium', e.target.value)
                    }
                    helperText="繁体字を入力した場合は栄養成分含め全項目を埋めてください（未入力なら日本語が表示されます）"
                  />
                </Grid>
              </>
            )}
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
