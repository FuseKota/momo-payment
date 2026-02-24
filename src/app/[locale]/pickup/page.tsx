'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PaymentIcon from '@mui/icons-material/Payment';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Layout, ProductCard } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { useSnackbar } from '@/hooks/useSnackbar';
import { getLocalizedName } from '@/lib/utils/localize-product';
import type { Product } from '@/types/database';

export default function PickupPage() {
  const t = useTranslations('pickup');
  const tc = useTranslations('common');
  const tRoot = useTranslations();
  const locale = useLocale();

  const steps = [
    { icon: <RestaurantMenuIcon sx={{ fontSize: 40 }} />, title: 'Step 1', description: t('step1') },
    { icon: <PaymentIcon sx={{ fontSize: 40 }} />, title: 'Step 2', description: t('step2') },
    { icon: <StorefrontIcon sx={{ fontSize: 40 }} />, title: 'Step 3', description: t('step3') },
  ];

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
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
      showSnackbar(tRoot(messageKey), 'error');
      return;
    }
    const success = addItem(product, 1);
    if (success) {
      showSnackbar(t('addedToCart', { name: getLocalizedName(product, locale) }));
    }
  };

  const getCartQty = (productId: string): number => {
    return items.find((i) => i.product.id === productId)?.qty || 0;
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    const newQty = getCartQty(productId) + delta;
    updateQty(productId, newQty <= 0 ? 0 : newQty);
  };

  const foodProducts = products.filter((p) => p.kind === 'FROZEN_FOOD');
  const goodsProducts = products.filter((p) => p.kind === 'GOODS');

  const renderProductGrid = (productList: Product[]) => (
    <Grid container spacing={3} sx={{ mb: 6 }}>
      {productList.map((product) => {
        const isOutOfStock = product.stock_qty !== null && product.stock_qty <= 0;
        return (
          <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <ProductCard
              product={product}
              locale={locale}
              cartQty={getCartQty(product.id)}
              onAdd={() => handleAddToCart(product)}
              onUpdateQty={(delta) => handleUpdateQty(product.id, delta)}
              disabled={!canAddProduct(product)}
              addLabel={tc('add')}
              isOutOfStock={isOutOfStock}
              outOfStockLabel={isOutOfStock ? tc('outOfStock') : undefined}
            />
          </Grid>
        );
      })}
    </Grid>
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
            <Typography variant="h5" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
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
        {cartMode === 'shipping' && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {t('shippingInCartWarning')}
          </Alert>
        )}

        {/* How it works */}
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, textAlign: 'center', color: '#1a1a1a' }}>
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
                  '&:hover': { boxShadow: 'none', transform: 'none' },
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
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>
                    {step.title}
                  </Typography>
                  <Typography color="text.secondary">{step.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!isLoading && foodProducts.length > 0 && (
          <>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, textAlign: 'center', color: '#1a1a1a' }}>
              {t('foodMenu')}
            </Typography>
            {renderProductGrid(foodProducts)}
          </>
        )}

        {!isLoading && goodsProducts.length > 0 && (
          <>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, textAlign: 'center', color: '#1a1a1a' }}>
              {t('goodsTitle')}
            </Typography>
            {renderProductGrid(goodsProducts)}
          </>
        )}

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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
}
