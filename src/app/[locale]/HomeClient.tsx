'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Chip,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { Layout } from '@/components/common';

export default function HomeClient() {
  const t = useTranslations('home');

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
              component="h1"
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
              {t('heroTitle').split('\n').map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </Typography>

            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 4, fontWeight: 400, lineHeight: 1.8 }}
            >
              {t('heroSubtitle').split('\n').map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                component={Link}
                href="/shop"
                variant="contained"
                size="large"
                startIcon={<LocalShippingIcon />}
                sx={{ minWidth: 180 }}
              >
                {t('shippingButton')}
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography
          component="h2"
          variant="h3"
          sx={{ textAlign: 'center', mb: 6, color: 'text.primary' }}
        >
          {t('orderMethods')}
        </Typography>

        <Grid container spacing={4}>
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
                  {t('shippingTitle')}
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {t('shippingDescription').split('\n').map((line, i) => (
                    <span key={i}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={t('nationwideShipping')}
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
