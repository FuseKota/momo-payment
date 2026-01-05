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
import AcUnitIcon from '@mui/icons-material/AcUnit';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InfoIcon from '@mui/icons-material/Info';
import { Layout } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import type { Product } from '@/types/database';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const { addItem, itemCount } = useCart();

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/products?slug=${slug}`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data);
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
    addItem(product, qty);
    router.push('/cart');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

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
          {/* Product Image */}
          <Grid size={{ xs: 12, md: 6 }}>
            {product.image_url ? (
              <Paper
                sx={{
                  height: 400,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="img"
                  src={product.image_url}
                  alt={product.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </Paper>
            ) : (
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
            )}
          </Grid>

          {/* Product Info */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box>
              <Box sx={{ mb: 2 }}>
                {product.temp_zone === 'FROZEN' ? (
                  <Chip
                    icon={<AcUnitIcon />}
                    label="冷凍食品"
                    color="primary"
                    variant="outlined"
                  />
                ) : (
                  <Chip label="グッズ" color="default" variant="outlined" />
                )}
              </Box>

              <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
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

              {/* Quantity Selector */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Typography variant="body1" sx={{ mr: 3 }}>
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
                sx={{ mb: 3, py: 1.5 }}
              >
                カートに追加
              </Button>

              {product.temp_zone === 'FROZEN' && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: '#FFF0F3',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                >
                  <AcUnitIcon sx={{ color: 'primary.main', mt: 0.3 }} />
                  <Typography variant="body2" color="text.secondary">
                    この商品は冷凍便でお届けします。
                    送料: ¥1,200
                  </Typography>
                </Box>
              )}
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
