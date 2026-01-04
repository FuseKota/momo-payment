'use client';

import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import PaymentIcon from '@mui/icons-material/Payment';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Layout } from '@/components/common';

const menuItems = [
  {
    name: '魯肉飯（ルーローハン）',
    description: '八角香る豚バラ煮込み丼',
    price: 850,
  },
  {
    name: '鶏肉飯（チーローハン）',
    description: '台湾風チキンライス',
    price: 800,
  },
  {
    name: '排骨飯（パイコーハン）',
    description: 'サクサク豚カツ丼',
    price: 950,
  },
];

const steps = [
  {
    icon: <RestaurantMenuIcon sx={{ fontSize: 40 }} />,
    title: 'Step 1',
    description: '日時を予約',
  },
  {
    icon: <PaymentIcon sx={{ fontSize: 40 }} />,
    title: 'Step 2',
    description: 'お支払い方法を選択',
  },
  {
    icon: <StorefrontIcon sx={{ fontSize: 40 }} />,
    title: 'Step 3',
    description: '店頭で受取',
  },
];

export default function PickupPage() {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  return (
    <Layout>
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
              店頭受取
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
            >
              事前予約でスムーズにお受け取り。
              待ち時間なしで出来立てをお渡しします。
            </Typography>
            <Button
              component={Link}
              href="/checkout/pickup"
              variant="contained"
              size="large"
              startIcon={<StorefrontIcon />}
              sx={{ px: 4, py: 1.5 }}
            >
              予約する
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* How it works */}
        <Typography
          variant="h4"
          sx={{ mb: 4, fontWeight: 700, textAlign: 'center' }}
        >
          ご利用の流れ
        </Typography>

        <Grid container spacing={4} sx={{ mb: 8 }}>
          {steps.map((step, index) => (
            <Grid key={index} size={{ xs: 12, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  boxShadow: 'none',
                  border: '1px solid',
                  borderColor: 'divider',
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

        {/* Menu Preview */}
        <Typography
          variant="h4"
          sx={{ mb: 4, fontWeight: 700, textAlign: 'center' }}
        >
          メニュー
        </Typography>

        <Grid container spacing={3} sx={{ mb: 6 }}>
          {menuItems.map((item, index) => (
            <Grid key={index} size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box
                  sx={{
                    height: 150,
                    backgroundColor: '#FFF0F3',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <Typography sx={{ fontSize: '4rem' }}>🍚</Typography>
                </Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                  {item.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {item.description}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: 'primary.main', fontWeight: 700 }}
                >
                  ¥{formatPrice(item.price)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ※メニューは店頭でお選びください
          </Typography>
          <Button
            component={Link}
            href="/checkout/pickup"
            variant="contained"
            size="large"
            startIcon={<StorefrontIcon />}
          >
            受取予約をする
          </Button>
        </Box>

        {/* Store Info */}
        <Paper sx={{ p: 4, backgroundColor: '#FFF0F3' }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocationOnIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">店舗情報</Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                もも娘
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                〒150-0001 東京都渋谷区神宮前1-2-3
              </Typography>
              <Typography variant="body2" color="text.secondary">
                最寄り駅: 原宿駅より徒歩5分
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccessTimeIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">営業時間</Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                11:00 - 20:00
              </Typography>
              <Typography variant="body2" color="text.secondary">
                定休日: 不定休（SNSでお知らせ）
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Layout>
  );
}
