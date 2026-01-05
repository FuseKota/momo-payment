'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Layout } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import type { Product } from '@/types/database';

type TabValue = 'all' | 'frozen' | 'goods';

export default function ShopPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const { addItem, itemCount, canAddProduct, getIncompatibleModeMessage, cartMode } = useCart();

  useEffect(() => {
    async function fetchProducts() {
      try {
        // Only fetch shipping products
        const response = await fetch('/api/products?mode=shipping');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const getDisplayProducts = (): Product[] => {
    switch (tab) {
      case 'frozen':
        return products.filter((p) => p.kind === 'FROZEN_FOOD');
      case 'goods':
        return products.filter((p) => p.kind === 'GOODS');
      default:
        return products;
    }
  };

  const handleAddToCart = (product: Product) => {
    const message = getIncompatibleModeMessage(product);
    if (message) {
      setSnackbar({ open: true, message, severity: 'error' });
      return;
    }
    const success = addItem(product, 1);
    if (success) {
      setSnackbar({ open: true, message: `${product.name}をカートに追加しました`, severity: 'success' });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  return (
    <Layout cartItemCount={itemCount}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(180deg, #FFF0F3 0%, #FFFBFC 100%)',
          py: { xs: 4, md: 6 },
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            sx={{
              textAlign: 'center',
              mb: 2,
              background: 'linear-gradient(135deg, #FF6680 0%, #E84D6A 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            配送注文
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: 'center' }}
          >
            冷凍魯肉飯やグッズをご自宅にお届けします
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Cart mode warning */}
        {cartMode === 'pickup' && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            キッチンカー販売商品がカートにあります。配送商品を追加するにはカートをクリアしてください。
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ mb: 4, borderBottom: '2px solid #FFE0E6' }}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{
              '& .MuiTab-root': {
                minWidth: 100,
                fontWeight: 600,
              },
              '& .Mui-selected': {
                color: 'primary.main',
              },
            }}
          >
            <Tab label="すべて" value="all" />
            <Tab label="フード" value="frozen" />
            <Tab label="グッズ" value="goods" />
          </Tabs>
        </Box>

        {/* Loading */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Products Grid */}
        {!isLoading && (
          <Grid container spacing={3}>
            {getDisplayProducts().map((product) => (
              <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Link href={`/shop/${product.slug}`} style={{ textDecoration: 'none' }}>
                    {product.image_url ? (
                      <CardMedia
                        component="img"
                        image={product.image_url}
                        alt={product.name}
                        sx={{
                          height: 200,
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <CardMedia
                        sx={{
                          height: 200,
                          backgroundColor: '#FFF0F3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography sx={{ fontSize: '4rem' }}>
                          {product.kind === 'FROZEN_FOOD' ? '🍚' : '🎁'}
                        </Typography>
                      </CardMedia>
                    )}
                  </Link>

                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Link href={`/shop/${product.slug}`} style={{ textDecoration: 'none' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          mb: 1,
                          color: 'text.primary',
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        {product.name}
                      </Typography>
                    </Link>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {product.description}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ color: 'primary.main', fontWeight: 700 }}
                      >
                        ¥{formatPrice(product.price_yen)}
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<ShoppingCartIcon />}
                        onClick={() => handleAddToCart(product)}
                        disabled={!canAddProduct(product)}
                      >
                        追加
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty state */}
        {!isLoading && getDisplayProducts().length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">
              商品がありません
            </Typography>
          </Box>
        )}

        {/* Shipping Info */}
        <Box
          sx={{
            mt: 6,
            p: 3,
            borderRadius: 3,
            backgroundColor: '#FFF0F3',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
            配送について
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • 送料: ¥1,200（全国一律）
          </Typography>
        </Box>
      </Container>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
