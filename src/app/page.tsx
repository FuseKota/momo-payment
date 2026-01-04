'use client';

import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AcUnitIcon from '@mui/icons-material/AcUnit';
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
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF859A 0%, #FF6680 100%)',
                mb: 3,
                boxShadow: '0 8px 32px rgba(255, 102, 128, 0.3)',
              }}
            >
              <Typography sx={{ fontSize: '2.5rem' }}>🍑</Typography>
            </Box>

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
              もも娘へようこそ
            </Typography>

            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 4, fontWeight: 400, lineHeight: 1.8 }}
            >
              本格台湾魯肉飯とオリジナルグッズ
              <br />
              店頭受け取り・配送でお届けします
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
                店頭受け取り
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
          {/* 店頭受け取り */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 40px rgba(255, 102, 128, 0.2)',
                },
              }}
              component={Link}
              href="/pickup"
            >
              <CardContent sx={{ p: 4 }}>
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
                  店頭受け取り
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  お店で直接お受け取りいただけます。
                  事前決済または店頭払いをお選びいただけます。
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
                    label="店頭払いOK"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 配送注文 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 40px rgba(255, 102, 128, 0.2)',
                },
              }}
              component={Link}
              href="/shop"
            >
              <CardContent sx={{ p: 4 }}>
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
                    icon={<AcUnitIcon />}
                    label="冷凍便対応"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label="全国配送"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Info Section */}
      <Box sx={{ backgroundColor: '#FFF0F3', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Box
            sx={{
              textAlign: 'center',
              p: 4,
              borderRadius: 4,
              backgroundColor: 'white',
              boxShadow: '0 4px 20px rgba(255, 102, 128, 0.1)',
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, color: 'primary.main' }}>
              🍑 もも娘について
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 2 }}>
              台湾の家庭料理「魯肉飯（ルーローハン）」を
              <br />
              本場の味でお届けするお店です。
              <br />
              こだわりの八角香る豚バラ肉の煮込みを
              <br />
              ぜひお楽しみください。
            </Typography>
          </Box>
        </Container>
      </Box>
    </Layout>
  );
}
