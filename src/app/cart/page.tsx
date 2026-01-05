'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { Layout } from '@/components/common';
import { useCart } from '@/contexts/CartContext';

const SHIPPING_FEE = 1200;

export default function CartPage() {
  const router = useRouter();
  const { items, updateQty, removeItem, clearCart, subtotal, itemCount, getTempZone, hasMixedTempZones, cartMode } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  const tempZone = getTempZone();
  const isPickupMode = cartMode === 'pickup';
  const total = isPickupMode ? subtotal : subtotal + (items.length > 0 ? SHIPPING_FEE : 0);

  if (items.length === 0) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundColor: '#FFF0F3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <ShoppingCartIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          </Box>
          <Typography variant="h4" sx={{ mb: 2 }}>
            カートは空です
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            商品をカートに追加してください
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/shop"
              variant="contained"
              size="large"
              startIcon={<LocalShippingIcon />}
            >
              配送商品を見る
            </Button>
            <Button
              component={Link}
              href="/pickup"
              variant="outlined"
              size="large"
              startIcon={<StorefrontIcon />}
            >
              店頭受取商品を見る
            </Button>
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout cartItemCount={itemCount}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              カート
            </Typography>
            {isPickupMode ? (
              <Chip
                icon={<StorefrontIcon />}
                label="店頭受取"
                color="secondary"
                variant="outlined"
              />
            ) : (
              <Chip
                icon={<LocalShippingIcon />}
                label="配送"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Button
            startIcon={<DeleteSweepIcon />}
            color="error"
            onClick={clearCart}
          >
            カートを空にする
          </Button>
        </Box>

        {hasMixedTempZones() && !isPickupMode && (
          <Alert severity="error" sx={{ mb: 3 }}>
            冷凍食品とグッズは同時に注文できません。どちらかを削除してください。
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Cart Items */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3 }}>
              {items.map((item, index) => (
                <Box key={item.product.id}>
                  {index > 0 && <Divider sx={{ my: 3 }} />}
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    {/* Product Image */}
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        backgroundColor: '#FFF0F3',
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

                    {/* Product Info */}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box>
                          <Box sx={{ mb: 1 }}>
                            {item.product.temp_zone === 'FROZEN' ? (
                              <Chip
                                icon={<AcUnitIcon />}
                                label="冷凍"
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                label="常温"
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                            )}
                          </Box>
                          <Link
                            href={`/shop/${item.product.slug}`}
                            style={{ textDecoration: 'none' }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                color: 'text.primary',
                                '&:hover': { color: 'primary.main' },
                              }}
                            >
                              {item.product.name}
                            </Typography>
                          </Link>
                        </Box>
                        <IconButton
                          onClick={() => removeItem(item.product.id)}
                          sx={{ color: 'text.secondary' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mt: 2,
                        }}
                      >
                        {/* Quantity Controls */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => updateQty(item.product.id, item.qty - 1)}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ px: 2, minWidth: 32, textAlign: 'center' }}>
                            {item.qty}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateQty(item.product.id, Math.min(10, item.qty + 1))}
                            disabled={item.qty >= 10}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        {/* Price */}
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          ¥{formatPrice(item.product.price_yen * item.qty)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Paper>

            <Button
              component={Link}
              href={isPickupMode ? '/pickup' : '/shop'}
              startIcon={<ArrowBackIcon />}
              sx={{ mt: 3 }}
            >
              買い物を続ける
            </Button>
          </Grid>

          {/* Order Summary */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, position: 'sticky', top: 100 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                注文内容
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">小計</Typography>
                <Typography>¥{formatPrice(subtotal)}</Typography>
              </Box>

              {!isPickupMode && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShippingIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography color="text.secondary">
                      送料（{tempZone === 'FROZEN' ? '冷凍便' : '常温便'}）
                    </Typography>
                  </Box>
                  <Typography>¥{formatPrice(SHIPPING_FEE)}</Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  合計
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  ¥{formatPrice(total)}
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => router.push(isPickupMode ? '/checkout/pickup' : '/checkout/shipping')}
                disabled={!isPickupMode && hasMixedTempZones()}
                startIcon={isPickupMode ? <StorefrontIcon /> : <LocalShippingIcon />}
                sx={{ mb: 2 }}
              >
                {isPickupMode ? '受取予約に進む' : 'レジに進む'}
              </Button>

              {isPickupMode ? (
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
                  <StorefrontIcon sx={{ color: 'primary.main', fontSize: 18, mt: 0.3 }} />
                  <Typography variant="body2" color="text.secondary">
                    店頭でお受け取りください
                  </Typography>
                </Box>
              ) : tempZone === 'FROZEN' ? (
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
                  <AcUnitIcon sx={{ color: 'primary.main', fontSize: 18, mt: 0.3 }} />
                  <Typography variant="body2" color="text.secondary">
                    冷凍便でお届けします
                  </Typography>
                </Box>
              ) : null}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}
