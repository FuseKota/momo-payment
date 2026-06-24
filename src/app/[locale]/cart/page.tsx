'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Paper,
  Divider,
  Grid,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { Layout, QuantityControl, OrderSummary } from '@/components/common';
import type { OrderSummaryItem } from '@/components/common';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/utils/format';
import { getLocalizedName } from '@/lib/utils/localize-product';
import { MAX_ITEM_QUANTITY } from '@/lib/utils/constants';
import { peachPink } from '@/lib/mui/theme';

function CartPageContent() {
  const t = useTranslations('cart');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, updateQty, removeItem, clearCart, subtotal, itemCount } = useCart();

  // Stripe Checkout からの戻り（cancel_url の ?canceled=1）。お支払い未完了の案内を出す。
  const paymentCanceled = searchParams.get('canceled') === '1';

  // 「レジに進む」の二重遷移ガード。一度押したら再クリックを無効化する。
  const [navigating, setNavigating] = useState(false);

  const proceedToCheckout = () => {
    if (navigating) return;
    setNavigating(true);
    router.push('/checkout/shipping');
  };

  // 配送料はお届け先（都道府県）で変動するため、カート段階では確定しない
  const shippingPending = items.length > 0;
  const total = subtotal;

  if (items.length === 0) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundColor: peachPink[50],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <ShoppingCartIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          </Box>
          <Typography variant="h4" sx={{ mb: 2, color: 'text.primary' }}>
            {t('empty')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {t('emptyMessage')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button component={Link} href="/shop" variant="contained" size="large" startIcon={<LocalShippingIcon />}>
              {t('viewShippingProducts')}
            </Button>
          </Box>
        </Container>
      </Layout>
    );
  }

  const summaryItems: OrderSummaryItem[] = items.map((item) => ({
    key: item.variant?.id ? `${item.product.id}:${item.variant.id}` : item.product.id,
    name: getLocalizedName(item.product, locale),
    suffix: item.variant?.size ?? undefined,
    qty: item.qty,
    totalPrice: (item.variant?.price_yen ?? item.product.price_yen) * item.qty,
  }));

  return (
    <Layout cartItemCount={itemCount}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {paymentCanceled && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('paymentCanceledNotice')}
          </Alert>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 }, flexWrap: 'wrap' }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', fontSize: { xs: '1.75rem', md: '3rem' } }}>
              {t('title')}
            </Typography>
            <Chip icon={<LocalShippingIcon />} label={t('shippingMode')} color="primary" variant="outlined" />
          </Box>
          <Button startIcon={<DeleteSweepIcon />} color="error" onClick={clearCart}>
            {t('clearCart')}
          </Button>
        </Box>

        <Grid container spacing={{ xs: 2, md: 4 }}>
          {/* Cart Items */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3 }}>
              {items.map((item, index) => {
                const itemKey = item.variant?.id
                  ? `${item.product.id}:${item.variant.id}`
                  : item.product.id;
                const unitPrice = item.variant?.price_yen ?? item.product.price_yen;

                return (
                  <Box key={itemKey}>
                    {index > 0 && <Divider sx={{ my: 3 }} />}
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      {item.product.image_url ? (
                        <Box
                          component="img"
                          src={item.product.image_url}
                          alt={getLocalizedName(item.product, locale)}
                          sx={{
                            width: { xs: 80, md: 100 },
                            height: { xs: 80, md: 100 },
                            borderRadius: 2,
                            objectFit: 'cover',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: { xs: 80, md: 100 },
                            height: { xs: 80, md: 100 },
                            backgroundColor: peachPink[50],
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Typography sx={{ fontSize: '3rem' }}>
                            {item.product.kind === 'FROZEN_FOOD' ? '🍚' : '🎁'}
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <Link href={`/shop/${item.product.slug}`} style={{ textDecoration: 'none' }}>
                            <Typography
                              variant="h6"
                              sx={{ color: 'text.primary', '&:hover': { color: 'primary.main' } }}
                            >
                              {getLocalizedName(item.product, locale)}
                              {item.variant?.size && (
                                <Typography
                                  component="span"
                                  sx={{ ml: 1, color: 'text.secondary', fontWeight: 400 }}
                                >
                                  ({item.variant.size})
                                </Typography>
                              )}
                            </Typography>
                          </Link>
                          <IconButton
                            onClick={() => removeItem(item.product.id, item.variant?.id)}
                            sx={{ color: 'text.secondary' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                          <QuantityControl
                            qty={item.qty}
                            onDecrement={() => updateQty(item.product.id, item.qty - 1, item.variant?.id)}
                            onIncrement={() => updateQty(item.product.id, Math.min(MAX_ITEM_QUANTITY, item.qty + 1), item.variant?.id)}
                            disableIncrement={item.qty >= MAX_ITEM_QUANTITY}
                            variant="standard"
                            size="small"
                          />
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            ¥{formatPrice(unitPrice * item.qty)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Paper>

            <Button
              component={Link}
              href="/shop"
              startIcon={<ArrowBackIcon />}
              sx={{ mt: 3 }}
            >
              {t('continueShopping')}
            </Button>
          </Grid>

          {/* Order Summary */}
          <Grid size={{ xs: 12, md: 4 }}>
            <OrderSummary
              items={summaryItems}
              subtotal={subtotal}
              shippingFeePending={shippingPending}
              total={total}
              labels={{
                title: t('orderSummary'),
                subtotal: tc('subtotal'),
                shippingFee: tc('shippingFee'),
                shippingFeePending: t('shippingFeeVaries'),
                total: tc('total'),
                quantity: tc('quantity'),
              }}
              showItemDetails={false}
            >
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={proceedToCheckout}
                disabled={navigating}
                startIcon={navigating ? <CircularProgress size={20} color="inherit" /> : <LocalShippingIcon />}
                sx={{ mb: 2 }}
              >
                {t('proceedToCheckout')}
              </Button>
            </OrderSummary>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}

// useSearchParams(canceled=1) を使うため Suspense 境界でラップする
export default function CartPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Layout>
      }
    >
      <CartPageContent />
    </Suspense>
  );
}
