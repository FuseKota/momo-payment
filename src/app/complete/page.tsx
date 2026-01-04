'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HomeIcon from '@mui/icons-material/Home';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { Layout } from '@/components/common';

function CompleteContent() {
  const searchParams = useSearchParams();
  const orderNo = searchParams.get('orderNo');
  const type = searchParams.get('type') || 'shipping';

  const isPickup = type === 'pickup';

  return (
    <Layout>
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: '#E8F5E9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 60, color: '#4CAF50' }} />
          </Box>

          <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
            {isPickup ? '予約が完了しました' : 'ご注文ありがとうございます'}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {isPickup
              ? '店頭受取のご予約を承りました。'
              : 'ご注文を承りました。決済完了メールをお送りしました。'}
          </Typography>

          {orderNo && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                注文番号
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  fontFamily: 'monospace',
                }}
              >
                {orderNo}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 4 }} />

          {isPickup ? (
            <Box sx={{ textAlign: 'left', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <StorefrontIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">店頭受取について</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ご予約いただいた日時に店舗までお越しください。
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#FFF0F3' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  もも娘
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  〒150-0001 東京都渋谷区神宮前1-2-3
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  営業時間: 11:00 - 20:00
                </Typography>
              </Paper>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'left', mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalShippingIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6">配送について</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                商品は3営業日以内に発送いたします。
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                発送完了後、追跡番号をメールでお知らせいたします。
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ※冷凍食品は冷凍便でお届けします。
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 4 }} />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </Typography>

            <Button
              component={Link}
              href="/"
              variant="contained"
              size="large"
              startIcon={<HomeIcon />}
              fullWidth
            >
              トップページに戻る
            </Button>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}

export default function CompletePage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
            <Typography>読み込み中...</Typography>
          </Container>
        </Layout>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
