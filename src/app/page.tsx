'use client';

import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Chip,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Layout } from '@/components/common';

export default function Home() {
  return (
    <Layout>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(180deg, #FFF0F3 0%, #FFFBFC 100%)',
          pt: { xs: 6, md: 10 },
          pb: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 133, 154, 0.2) 0%, rgba(255, 102, 128, 0.1) 100%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -50,
            left: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 193, 7, 0.05) 100%)',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 700, mx: 'auto' }}>
            <Typography
              variant="h1"
              sx={{
                mb: 2,
                fontSize: { xs: '2rem', md: '3rem' },
                background: 'linear-gradient(135deg, #FF6680 0%, #E84D6A 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              福島もも娘物販サイトへ
              <br />
              ようこそ
            </Typography>

            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 4, fontWeight: 400, lineHeight: 1.8 }}
            >
              本格台湾料理と福島もも娘オリジナルグッズ
              <br />
              キッチンカー販売・配送でお届けします
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/pickup"
                variant="contained"
                size="large"
                startIcon={<StorefrontIcon />}
                sx={{ minWidth: 180 }}
              >
                キッチンカー販売
              </Button>
              <Button
                component={Link}
                href="/shop"
                variant="outlined"
                size="large"
                startIcon={<LocalShippingIcon />}
                sx={{ minWidth: 180 }}
              >
                配送注文
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography
          variant="h3"
          sx={{ textAlign: 'center', mb: 6, color: 'text.primary' }}
        >
          ご注文方法
        </Typography>

        <Grid container spacing={4}>
          {/* キッチンカー販売 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              component={Link}
              href="/pickup"
              sx={{
                display: 'block',
                height: '100%',
                textDecoration: 'none',
                border: '3px solid #FF6680',
                borderRadius: '12px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(255, 102, 128, 0.2)',
                },
              }}
            >
              <Box sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #FFF0F3 0%, #FFE0E6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                  }}
                >
                  <StorefrontIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>

                <Typography variant="h4" sx={{ mb: 2, color: 'text.primary' }}>
                  キッチンカー販売
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  キッチンカーで直接お受け取りいただけます。
                  事前決済または現地払いをお選びいただけます。
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<AccessTimeIcon />}
                    label="事前注文"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label="現地払いOK"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* 配送注文 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              component={Link}
              href="/shop"
              sx={{
                display: 'block',
                height: '100%',
                textDecoration: 'none',
                border: '3px solid #FF6680',
                borderRadius: '12px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(255, 102, 128, 0.2)',
                },
              }}
            >
              <Box sx={{ p: 4 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #FFF0F3 0%, #FFE0E6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                  }}
                >
                  <LocalShippingIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>

                <Typography variant="h4" sx={{ mb: 2, color: 'text.primary' }}>
                  配送注文
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  冷凍魯肉飯やもも娘グッズを
                  ご自宅までお届けします。
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label="全国配送"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

    </Layout>
  );
}
