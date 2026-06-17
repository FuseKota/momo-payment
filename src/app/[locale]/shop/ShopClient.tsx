'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Box,
  Container,
  Typography,
  Grid,
  Tabs,
  Tab,
  Alert,
  Snackbar,
} from '@mui/material';
import { Layout, ProductCard } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { useSnackbar } from '@/hooks/useSnackbar';
import { getLocalizedName } from '@/lib/utils/localize-product';
import type { Product } from '@/types/database';

type TabValue = 'all' | 'frozen' | 'goods';

interface ShopClientProps {
  /** サーバー側でプリフェッチした配送対象商品一覧 */
  initialProducts: Product[];
}

export default function ShopClient({ initialProducts }: ShopClientProps) {
  const t = useTranslations('shop');
  const tc = useTranslations('common');
  const tRoot = useTranslations();
  const locale = useLocale();

  const [tab, setTab] = useState<TabValue>('all');
  const products = initialProducts;
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
  const { addItem, itemCount, canAddProduct, getIncompatibleModeMessage, cartMode, items, updateQty } = useCart();

  const isOutOfStock = (p: Product) => p.stock_qty !== null && p.stock_qty <= 0;

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
    if (product.has_variants) return;
    if (isOutOfStock(product)) {
      showSnackbar(tc('outOfStock'), 'error');
      return;
    }
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
            component="h1"
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
              '& .MuiTab-root': { minWidth: 100, fontWeight: 600 },
              '& .Mui-selected': { color: 'primary.main' },
            }}
          >
            <Tab label={t('all')} value="all" />
            <Tab label={t('frozen')} value="frozen" />
            <Tab label={t('goods')} value="goods" />
          </Tabs>
        </Box>

        <Grid container spacing={3}>
          {getDisplayProducts().map((product, index) => (
            <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ProductCard
                product={product}
                locale={locale}
                cartQty={getCartQty(product.id)}
                onAdd={() => handleAddToCart(product)}
                onUpdateQty={(delta) => handleUpdateQty(product.id, delta)}
                disabled={!canAddProduct(product) || isOutOfStock(product)}
                isOutOfStock={isOutOfStock(product)}
                outOfStockLabel={tc('outOfStock')}
                variantLink={product.has_variants ? `/shop/${product.slug}` : undefined}
                variantLinkLabel={product.has_variants ? t('selectSize') : undefined}
                addLabel={tc('add')}
                detailLink={`/shop/${product.slug}`}
                imageHeight={200}
                priority={index < 3}
              />
            </Grid>
          ))}
        </Grid>

        {getDisplayProducts().length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">{t('noProducts')}</Typography>
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('shippingDeliveryInfo')}
          </Typography>
        </Box>
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
