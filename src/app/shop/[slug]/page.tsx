'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  IconButton,
  Paper,
  Divider,
  Breadcrumbs,
  Grid,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InfoIcon from '@mui/icons-material/Info';
import { Layout } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/utils/format';
import type { Product, ProductVariant, ProductWithVariants } from '@/types/database';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const { addItem, itemCount } = useCart();

  // Combine image_url and images array into a single array
  const getAllImages = (p: Product): string[] => {
    const imgs: string[] = [];
    if (p.image_url) imgs.push(p.image_url);
    if (p.images && Array.isArray(p.images)) {
      imgs.push(...p.images.filter((img) => img && !imgs.includes(img)));
    }
    return imgs;
  };

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/products?slug=${slug}`);
        if (response.ok) {
          const data: ProductWithVariants = await response.json();
          setProduct(data);

          // Auto-select first available variant if product has variants
          if (data.has_variants && data.variants?.length > 0) {
            const firstAvailable = data.variants.find(
              (v) => v.is_active && (v.stock_qty === null || v.stock_qty > 0)
            );
            setSelectedVariant(firstAvailable || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProduct();
  }, [slug]);

  if (isLoading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            商品が見つかりません
          </Typography>
          <Button
            component={Link}
            href="/shop"
            variant="contained"
            startIcon={<ArrowBackIcon />}
          >
            商品一覧に戻る
          </Button>
        </Container>
      </Layout>
    );
  }

  const handleAddToCart = () => {
    // If product has variants but none selected, don't add
    if (product.has_variants && !selectedVariant) {
      return;
    }
    addItem(product, qty, selectedVariant || undefined);
    router.push('/cart');
  };

  // Check if add to cart should be disabled
  const isAddToCartDisabled = product.has_variants && !selectedVariant;

  return (
    <Layout cartItemCount={itemCount}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            ホーム
          </Link>
          <Link href="/shop" style={{ textDecoration: 'none', color: 'inherit' }}>
            配送注文
          </Link>
          <Typography color="text.primary">{product.name}</Typography>
        </Breadcrumbs>

        <Grid container spacing={4}>
          {/* Product Images */}
          <Grid size={{ xs: 12, md: 6 }}>
            {(() => {
              const allImages = getAllImages(product);
              if (allImages.length === 0) {
                return (
                  <Paper
                    sx={{
                      height: 400,
                      backgroundColor: '#FFF0F3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 3,
                    }}
                  >
                    <Typography sx={{ fontSize: '8rem' }}>
                      {product.kind === 'FROZEN_FOOD' ? '🍚' : '🎁'}
                    </Typography>
                  </Paper>
                );
              }
              return (
                <Box>
                  {/* Main Image */}
                  <Paper
                    sx={{
                      height: 400,
                      borderRadius: 3,
                      overflow: 'hidden',
                      mb: 2,
                    }}
                  >
                    <Box
                      component="img"
                      src={allImages[selectedImageIndex]}
                      alt={`${product.name} - 画像${selectedImageIndex + 1}`}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Paper>
                  {/* Thumbnails */}
                  {allImages.length > 1 && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {allImages.map((img, index) => (
                        <Box
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: 2,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: '3px solid',
                            borderColor: selectedImageIndex === index ? 'primary.main' : 'transparent',
                            opacity: selectedImageIndex === index ? 1 : 0.7,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              opacity: 1,
                            },
                          }}
                        >
                          <Box
                            component="img"
                            src={img}
                            alt={`${product.name} - サムネイル${index + 1}`}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })()}
          </Grid>

          {/* Product Info */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box>
              <Typography variant="h3" sx={{ mb: 2, fontWeight: 700, color: '#1a1a1a' }}>
                {product.name}
              </Typography>

              <Typography
                variant="h4"
                sx={{ mb: 3, color: 'primary.main', fontWeight: 700 }}
              >
                ¥{formatPrice(product.price_yen)}
                <Typography
                  component="span"
                  variant="body1"
                  sx={{ ml: 1, color: 'text.secondary' }}
                >
                  (税込)
                </Typography>
              </Typography>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 4, lineHeight: 1.8 }}
              >
                {product.description}
              </Typography>

              {/* Size Selector */}
              {product.has_variants && product.variants && product.variants.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#1a1a1a' }}>
                    サイズを選択:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {product.variants
                      .filter((v) => v.is_active)
                      .map((variant) => {
                        const isOutOfStock = variant.stock_qty !== null && variant.stock_qty <= 0;
                        const isSelected = selectedVariant?.id === variant.id;

                        return (
                          <Button
                            key={variant.id}
                            variant={isSelected ? 'contained' : 'outlined'}
                            disabled={isOutOfStock}
                            onClick={() => setSelectedVariant(variant)}
                            sx={{
                              minWidth: 70,
                              fontWeight: 600,
                              opacity: isOutOfStock ? 0.5 : 1,
                            }}
                          >
                            {variant.size}
                            {isOutOfStock && (
                              <Typography
                                component="span"
                                sx={{ fontSize: '0.7rem', ml: 0.5 }}
                              >
                                (在庫切れ)
                              </Typography>
                            )}
                          </Button>
                        );
                      })}
                  </Box>
                </Box>
              )}

              {/* Quantity Selector */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Typography variant="body1" sx={{ mr: 3, color: '#1a1a1a' }}>
                  数量:
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '2px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <IconButton
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}
                  >
                    <RemoveIcon />
                  </IconButton>
                  <Typography
                    sx={{
                      px: 3,
                      fontWeight: 600,
                      minWidth: 40,
                      textAlign: 'center',
                      color: '#1a1a1a',
                    }}
                  >
                    {qty}
                  </Typography>
                  <IconButton
                    onClick={() => setQty(Math.min(10, qty + 1))}
                    disabled={qty >= 10}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<ShoppingCartIcon />}
                onClick={handleAddToCart}
                disabled={isAddToCartDisabled}
                sx={{ mb: 3, py: 1.5 }}
              >
                {isAddToCartDisabled ? 'サイズを選択してください' : 'カートに追加'}
              </Button>

              </Box>
          </Grid>
        </Grid>

        {/* Food Label (for frozen food) */}
        {product.food_label && (
          <Paper sx={{ mt: 4, p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <InfoIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h5">商品情報</Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              {product.food_label.ingredients && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    原材料名
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.food_label.ingredients}
                  </Typography>
                </Grid>
              )}

              {product.food_label.allergens && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    アレルゲン
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.food_label.allergens}
                  </Typography>
                </Grid>
              )}

              {product.food_label.net_weight_grams && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    内容量
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.food_label.net_weight_grams}g
                  </Typography>
                </Grid>
              )}

              {product.food_label.expiry_info && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    賞味期限
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.food_label.expiry_info}
                  </Typography>
                </Grid>
              )}

              {product.food_label.storage_method && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    保存方法
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.food_label.storage_method}
                  </Typography>
                </Grid>
              )}

              {product.food_label.manufacturer && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    製造者
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.food_label.manufacturer}
                  </Typography>
                </Grid>
              )}

              {product.food_label.nutrition && (
                <Grid size={12}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 2 }}
                  >
                    栄養成分表示（1食あたり）
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 2,
                    }}
                  >
                    <Chip
                      label={`エネルギー: ${product.food_label.nutrition.calories}kcal`}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`たんぱく質: ${product.food_label.nutrition.protein}g`}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`脂質: ${product.food_label.nutrition.fat}g`}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`炭水化物: ${product.food_label.nutrition.carbohydrates}g`}
                      variant="outlined"
                      size="small"
                    />
                    <Chip
                      label={`食塩相当量: ${(product.food_label.nutrition.sodium ?? 0) / 1000}g`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>
        )}

        {/* Back Button */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            component={Link}
            href="/shop"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
          >
            商品一覧に戻る
          </Button>
        </Box>
      </Container>
    </Layout>
  );
}
