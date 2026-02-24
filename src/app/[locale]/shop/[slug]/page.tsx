'use client';

import { useState, useEffect, use } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Paper,
  Divider,
  Breadcrumbs,
  Grid,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InfoIcon from '@mui/icons-material/Info';
import { Layout, QuantityControl } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/utils/format';
import { getLocalizedName, getLocalizedDescription, getLocalizedFoodLabel } from '@/lib/utils/localize-product';
import { MAX_ITEM_QUANTITY } from '@/lib/utils/constants';
import type { Product, ProductVariant, ProductWithVariants } from '@/types/database';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = use(params);
  const t = useTranslations('productDetail');
  const tc = useTranslations('common');
  const locale = useLocale();
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
            {t('notFound')}
          </Typography>
          <Button
            component={Link}
            href="/shop"
            variant="contained"
            startIcon={<ArrowBackIcon />}
          >
            {t('backToList')}
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
            {t('breadcrumbHome')}
          </Link>
          <Link href="/shop" style={{ textDecoration: 'none', color: 'inherit' }}>
            {t('breadcrumbShop')}
          </Link>
          <Typography color="text.primary">{getLocalizedName(product, locale)}</Typography>
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
                      alt={`${getLocalizedName(product, locale)} - 画像${selectedImageIndex + 1}`}
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
                            alt={`${getLocalizedName(product, locale)} - サムネイル${index + 1}`}
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
                {getLocalizedName(product, locale)}
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
                  {tc('taxIncluded')}
                </Typography>
              </Typography>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 4, lineHeight: 1.8 }}
              >
                {getLocalizedDescription(product, locale)}
              </Typography>

              {/* Size Selector */}
              {product.has_variants && product.variants && product.variants.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#1a1a1a' }}>
                    {t('selectSize')}
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
                                ({tc('outOfStock')})
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
                  {t('quantity')}
                </Typography>
                <QuantityControl
                  qty={qty}
                  onDecrement={() => setQty(Math.max(1, qty - 1))}
                  onIncrement={() => setQty(Math.min(MAX_ITEM_QUANTITY, qty + 1))}
                  disableDecrement={qty <= 1}
                  disableIncrement={qty >= MAX_ITEM_QUANTITY}
                  variant="inline"
                  size="medium"
                />
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
                {isAddToCartDisabled ? t('selectSizeFirst') : t('addToCart')}
              </Button>

              </Box>
          </Grid>
        </Grid>

        {/* Food Label (for frozen food) */}
        {(() => {
          const foodLabel = getLocalizedFoodLabel(product, locale);
          if (!foodLabel) return null;
          return (
            <Paper sx={{ mt: 4, p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <InfoIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h5">{t('productInfo')}</Typography>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                {foodLabel.ingredients && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      {t('ingredients')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {foodLabel.ingredients}
                    </Typography>
                  </Grid>
                )}

                {foodLabel.allergens && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      {t('allergens')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {foodLabel.allergens}
                    </Typography>
                  </Grid>
                )}

                {foodLabel.net_weight_grams && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      {t('netWeight')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {foodLabel.net_weight_grams}g
                    </Typography>
                  </Grid>
                )}

                {foodLabel.expiry_info && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      {t('expiryInfo')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {foodLabel.expiry_info}
                    </Typography>
                  </Grid>
                )}

                {foodLabel.storage_method && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      {t('storageMethod')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {foodLabel.storage_method}
                    </Typography>
                  </Grid>
                )}

                {foodLabel.manufacturer && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      {t('manufacturer')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {foodLabel.manufacturer}
                    </Typography>
                  </Grid>
                )}

                {foodLabel.nutrition && (
                  <Grid size={12}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, mb: 2 }}
                    >
                      {t('nutrition')}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                      }}
                    >
                      <Chip
                        label={t('calories', { value: foodLabel.nutrition.calories ?? 0 })}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={t('protein', { value: foodLabel.nutrition.protein ?? 0 })}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={t('fat', { value: foodLabel.nutrition.fat ?? 0 })}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={t('carbohydrates', { value: foodLabel.nutrition.carbohydrates ?? 0 })}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={t('sodium', { value: (foodLabel.nutrition.sodium ?? 0) / 1000 })}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>
          );
        })()}

        {/* Back Button */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            component={Link}
            href="/shop"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
          >
            {t('backToList')}
          </Button>
        </Box>
      </Container>
    </Layout>
  );
}
