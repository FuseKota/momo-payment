'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PaymentIcon from '@mui/icons-material/Payment';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Layout } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/utils/format';
import type { Product } from '@/types/database';

export default function PickupPage() {
  const t = useTranslations('pickup');
  const tc = useTranslations('common');
  const tRoot = useTranslations();

  const steps = [
    {
      icon: <RestaurantMenuIcon sx={{ fontSize: 40 }} />,
      title: 'Step 1',
      description: t('step1'),
    },
    {
      icon: <PaymentIcon sx={{ fontSize: 40 }} />,
      title: 'Step 2',
      description: t('step2'),
    },
    {
      icon: <StorefrontIcon sx={{ fontSize: 40 }} />,
      title: 'Step 3',
      description: t('step3'),
    },
  ];

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const { addItem, canAddProduct, getIncompatibleModeMessage, itemCount, items, updateQty, cartMode } = useCart();

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products?mode=pickup');
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

  const handleAddToCart = (product: Product) => {
    const messageKey = getIncompatibleModeMessage(product);
    if (messageKey) {
      setSnackbar({ open: true, message: tRoot(messageKey), severity: 'error' });
      return;
    }
    const success = addItem(product, 1);
    if (success) {
      setSnackbar({ open: true, message: t('addedToCart', { name: product.name }), severity: 'success' });
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

  // Group products by type
  const foodProducts = products.filter((p) =>
    ['karaage-5pc', 'tapioca-milk-tea', 'rurohan-single', 'rurohan-set', 'jirohan-single', 'jirohan-set', 'taiwan-beer', 'pineapple-cake'].includes(p.slug)
  );
  const goodsProducts = products.filter((p) =>
    ['tshirt-light', 'tshirt-heavy', 'keychain'].includes(p.slug)
  );

  return (
    <Layout cartItemCount={itemCount}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(180deg, #FFF0F3 0%, #FFFBFC 100%)',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                mb: 2,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #FF6680 0%, #E84D6A 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('title')}
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
            >
              {t('subtitle')}
            </Typography>
            {itemCount > 0 && (
              <Button
                component={Link}
                href="/checkout/pickup"
                variant="contained"
                size="large"
                startIcon={<ShoppingCartIcon />}
                sx={{ px: 4, py: 1.5 }}
              >
                {t('viewCart', { count: itemCount })}
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Cart mode warning */}
        {cartMode === 'shipping' && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {t('shippingInCartWarning')}
          </Alert>
        )}

        {/* How it works */}
        <Typography
          variant="h4"
          sx={{ mb: 4, fontWeight: 700, textAlign: 'center', color: '#1a1a1a' }}
        >
          {t('howItWorks')}
        </Typography>

        <Grid container spacing={4} sx={{ mb: 8 }}>
          {steps.map((step, index) => (
            <Grid key={index} size={{ xs: 12, md: 4 }}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  boxShadow: 'none',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    boxShadow: 'none',
                    transform: 'none',
                  },
                }}
              >
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      backgroundColor: '#FFF0F3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                      color: 'primary.main',
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}
                  >
                    {step.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {step.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Loading */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Food Menu */}
        {!isLoading && foodProducts.length > 0 && (
          <>
            <Typography
              variant="h4"
              sx={{ mb: 4, fontWeight: 700, textAlign: 'center', color: '#1a1a1a' }}
            >
              {t('foodMenu')}
            </Typography>

            <Grid container spacing={3} sx={{ mb: 6 }}>
              {foodProducts.map((product) => {
                const cartQty = getCartQty(product.id);
                return (
                  <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {product.image_url ? (
                        <CardMedia
                          component="img"
                          image={product.image_url}
                          alt={product.name}
                          sx={{ height: 180, objectFit: 'cover' }}
                        />
                      ) : (
                        <CardMedia
                          sx={{
                            height: 180,
                            backgroundColor: '#FFF0F3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography sx={{ fontSize: '4rem' }}>🍚</Typography>
                        </CardMedia>
                      )}
                      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                          {product.name}
                        </Typography>
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
                          {cartQty > 0 ? (
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
          </>
        )}

        {/* Goods */}
        {!isLoading && goodsProducts.length > 0 && (
          <>
            <Typography
              variant="h4"
              sx={{ mb: 4, fontWeight: 700, textAlign: 'center', color: '#1a1a1a' }}
            >
              {t('goodsTitle')}
            </Typography>

            <Grid container spacing={3} sx={{ mb: 6 }}>
              {goodsProducts.map((product) => {
                const cartQty = getCartQty(product.id);
                const isOutOfStock = product.stock_qty !== null && product.stock_qty <= 0;
                return (
                  <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {product.image_url ? (
                        <CardMedia
                          component="img"
                          image={product.image_url}
                          alt={product.name}
                          sx={{ height: 180, objectFit: 'cover' }}
                        />
                      ) : (
                        <CardMedia
                          sx={{
                            height: 180,
                            backgroundColor: '#FFF0F3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography sx={{ fontSize: '4rem' }}>🎁</Typography>
                        </CardMedia>
                      )}
                      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {isOutOfStock && (
                          <Chip label={tc('outOfStock')} color="error" size="small" sx={{ mb: 1, alignSelf: 'flex-start' }} />
                        )}
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                          {product.name}
                        </Typography>
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
                          {cartQty > 0 ? (
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
                              disabled={isOutOfStock || !canAddProduct(product)}
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
          </>
        )}

        {/* Checkout Button */}
        {itemCount > 0 && cartMode === 'pickup' && (
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Button
              component={Link}
              href="/checkout/pickup"
              variant="contained"
              size="large"
              startIcon={<ShoppingCartIcon />}
              sx={{ px: 6, py: 1.5 }}
            >
              {t('proceedToOrder', { count: itemCount })}
            </Button>
          </Box>
        )}

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
