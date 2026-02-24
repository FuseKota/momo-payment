'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
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
  IconButton,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Layout } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/utils/format';
import { getLocalizedName, getLocalizedDescription } from '@/lib/utils/localize-product';
import type { Product, ProductWithVariants } from '@/types/database';

type TabValue = 'all' | 'frozen' | 'goods';

export default function ShopPage() {
  const t = useTranslations('shop');
  const tc = useTranslations('common');
  const tRoot = useTranslations();
  const locale = useLocale();

  const [tab, setTab] = useState<TabValue>('all');
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const { addItem, itemCount, canAddProduct, getIncompatibleModeMessage, cartMode, items, updateQty } = useCart();

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

  const getDisplayProducts = (): ProductWithVariants[] => {
    switch (tab) {
      case 'frozen':
        return products.filter((p) => p.kind === 'FROZEN_FOOD');
      case 'goods':
        return products.filter((p) => p.kind === 'GOODS');
      default:
        return products;
    }
  };

  const handleAddToCart = (product: ProductWithVariants) => {
    // Don't allow adding products with variants from listing page
    if (product.has_variants) {
      return;
    }
    const messageKey = getIncompatibleModeMessage(product);
    if (messageKey) {
      setSnackbar({ open: true, message: tRoot(messageKey), severity: 'error' });
      return;
    }
    const success = addItem(product, 1);
    if (success) {
      setSnackbar({ open: true, message: t('addedToCart', { name: getLocalizedName(product, locale) }), severity: 'success' });
    }
  };

  const getCartQty = (productId: string): number => {
    const item = items.find((i) => i.product.id === productId);
    return item?.qty || 0;
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    const currentQty = getCartQty(productId);
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      updateQty(productId, 0);
    } else {
      updateQty(productId, newQty);
    }
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
            {t('title')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ textAlign: 'center' }}
          >
            {t('subtitle')}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Cart mode warning */}
        {cartMode === 'pickup' && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {t('pickupInCartWarning')}
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
            <Tab label={t('all')} value="all" />
            <Tab label={t('frozen')} value="frozen" />
            <Tab label={t('goods')} value="goods" />
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
            {getDisplayProducts().map((product) => {
              const cartQty = getCartQty(product.id);
              return (
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
                          alt={getLocalizedName(product, locale)}
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
                          {getLocalizedName(product, locale)}
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
                        {getLocalizedDescription(product, locale)}
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
                        {product.has_variants ? (
                          <Button
                            component={Link}
                            href={`/shop/${product.slug}`}
                            variant="outlined"
                            size="small"
                          >
                            {t('selectSize')}
                          </Button>
                        ) : cartQty > 0 ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              border: '2px solid',
                              borderColor: 'primary.main',
                              borderRadius: 2,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleUpdateQty(product.id, -1)}
                              sx={{ color: 'primary.main' }}
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography sx={{ px: 1, fontWeight: 600, minWidth: 24, textAlign: 'center' }}>
                              {cartQty}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleUpdateQty(product.id, 1)}
                              sx={{ color: 'primary.main' }}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddToCart(product)}
                            disabled={!canAddProduct(product)}
                          >
                            {tc('add')}
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Empty state */}
        {!isLoading && getDisplayProducts().length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">
              {t('noProducts')}
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
            {t('aboutShipping')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('shippingFeeInfo')}
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
