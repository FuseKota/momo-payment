'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Paper,
  Breadcrumbs,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { peachPink } from '@/lib/mui/theme';
import { Layout, QuantityControl } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/utils/format';
import { getLocalizedName, getLocalizedDescription } from '@/lib/utils/localize-product';
import { MAX_ITEM_QUANTITY } from '@/lib/utils/constants';
import type { Product, ProductVariant, ProductWithVariants } from '@/types/database';

interface Props {
  /** サーバー側で取得済みの商品（存在しなければ null） */
  product: ProductWithVariants | null;
}

export default function ProductDetailClient({ product }: Props) {
  const t = useTranslations('productDetail');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    () => {
      // バリアントを持つ商品は、最初の購入可能な variant を初期選択する
      if (product?.has_variants && product.variants?.length > 0) {
        return (
          product.variants.find(
            (v) => v.is_active && (v.stock_qty === null || v.stock_qty > 0)
          ) || null
        );
      }
      return null;
    }
  );
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

  const outOfStock = product.stock_qty !== null && product.stock_qty <= 0;

  const handleAddToCart = () => {
    if (outOfStock) return;
    // If product has variants but none selected, don't add
    if (product.has_variants && !selectedVariant) {
      return;
    }
    addItem(product, qty, selectedVariant || undefined);
    router.push('/cart');
  };

  // Check if add to cart should be disabled
  const isAddToCartDisabled = (product.has_variants && !selectedVariant) || outOfStock;

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
                      height: { xs: 240, sm: 320, md: 400 },
                      backgroundColor: peachPink[50],
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
                      position: 'relative',
                      height: { xs: 240, sm: 320, md: 400 },
                      borderRadius: 3,
                      overflow: 'hidden',
                      mb: 2,
                    }}
                  >
                    <Image
                      src={allImages[selectedImageIndex]}
                      alt={`${getLocalizedName(product, locale)}の商品画像`}
                      fill
                      sizes="(max-width: 900px) 100vw, 50vw"
                      style={{ objectFit: 'cover' }}
                      priority
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
                            position: 'relative',
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
                          <Image
                            src={img}
                            alt={`${getLocalizedName(product, locale)} - サムネイル${index + 1}`}
                            fill
                            sizes="80px"
                            style={{ objectFit: 'cover' }}
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
              <Typography component="h1" variant="h3" sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
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

              {outOfStock && (
                <Box sx={{ mb: 3 }}>
                  <Chip color="error" label={tc('outOfStock')} />
                </Box>
              )}

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
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
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
                <Typography variant="body1" sx={{ mr: 3, color: 'text.primary' }}>
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
                {outOfStock
                  ? tc('outOfStock')
                  : isAddToCartDisabled
                    ? t('selectSizeFirst')
                    : t('addToCart')}
              </Button>

              </Box>
          </Grid>
        </Grid>

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
