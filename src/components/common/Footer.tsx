'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Box, Container, Typography, Grid, IconButton } from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LanguageIcon from '@mui/icons-material/Language';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 6,
        background: 'linear-gradient(180deg, #FFE8ED 0%, #FFD6DE 100%)',
        borderTop: '1px solid rgba(255, 102, 128, 0.2)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{
                mr: 1.5,
                flexShrink: 0,
                width: 72,
                height: 72,
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <Image
                  src="/images/logo.svg"
                  alt="Sakura Sisters"
                  width={72}
                  height={72}
                  style={{ width: 'auto', height: 'auto' }}
                />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                福島もも娘
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              おいしい魯肉飯とかわいいグッズをお届けします
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                component="a"
                href="https://sakura-sisters.com/momo-musume/"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'rgba(255, 102, 128, 0.1)' },
                }}
              >
                <LanguageIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://www.instagram.com/momomusume_fukushima_official/"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'rgba(255, 102, 128, 0.1)' },
                }}
              >
                <InstagramIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://x.com/momomusume_jp"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'rgba(255, 102, 128, 0.1)' },
                }}
              >
                <XIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://www.youtube.com/@%E7%A6%8F%E5%B3%B6%E3%82%82%E3%82%82%E5%A8%98%E5%85%AC%E5%BC%8F"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'rgba(255, 102, 128, 0.1)' },
                }}
              >
                <YouTubeIcon />
              </IconButton>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
              ご注文
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/news" style={{ textDecoration: 'none' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  ニュース
                </Typography>
              </Link>
              <Link href="/shop" style={{ textDecoration: 'none' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  配送注文
                </Typography>
              </Link>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
              サポート
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/legal/tokushoho" style={{ textDecoration: 'none' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  特定商取引法に基づく表記
                </Typography>
              </Link>
              <Link href="/legal/privacy" style={{ textDecoration: 'none' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  プライバシーポリシー
                </Typography>
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: '1px solid rgba(255, 102, 128, 0.1)',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} もも娘. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
