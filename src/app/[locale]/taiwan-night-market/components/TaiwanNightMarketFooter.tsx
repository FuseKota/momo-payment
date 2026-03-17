'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Box,
  Container,
  Typography,
  Grid,
  IconButton,
} from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LanguageIcon from '@mui/icons-material/Language';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const gold = '#fbc02d';
const goldHover = 'rgba(251, 192, 45, 0.12)';

export default function TaiwanNightMarketFooter() {
  const t = useTranslations('taiwanNightMarket');
  const tc = useTranslations('common');
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const socialIconSx = {
    color: gold,
    '&:hover': { backgroundColor: goldHover },
  };

  const linkSx = {
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'none',
    '&:hover': { color: gold },
  };

  return (
    <>
      <Box
        component="footer"
        sx={{
          mt: 'auto',
          py: 6,
          backgroundColor: '#050005',
          borderTop: '2px solid rgba(251, 192, 45, 0.2)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {/* Brand */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', mr: 1.5, flexShrink: 0 }}>
                  <Image
                    src="/images/sakura-sisters-logo.png"
                    alt="Sakura Sisters"
                    width={40}
                    height={40}
                    style={{ objectFit: 'cover' }}
                  />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: gold }}>
                  福島もも娘
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.5)' }}>
                {t('footerTagline')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {[
                  { href: 'https://sakura-sisters.com/momo-musume/', icon: <LanguageIcon /> },
                  { href: 'https://www.instagram.com/momomusume_fukushima_official/', icon: <InstagramIcon /> },
                  { href: 'https://x.com/momomusume_jp', icon: <XIcon /> },
                  { href: 'https://www.youtube.com/@%E7%A6%8F%E5%B3%B6%E3%82%82%E3%82%82%E5%A8%98%E5%85%AC%E5%BC%8F', icon: <YouTubeIcon /> },
                ].map((link) => (
                  <IconButton
                    key={link.href}
                    component="a"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    sx={socialIconSx}
                  >
                    {link.icon}
                  </IconButton>
                ))}
              </Box>
            </Grid>

            {/* Order links */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: gold }}>
                {t('footerOrder')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link href="/news" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" sx={linkSx}>
                    {tc('news')}
                  </Typography>
                </Link>
                <Link href="/shop" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" sx={linkSx}>
                    {tc('shipping')}
                  </Typography>
                </Link>
              </Box>
            </Grid>

            {/* Support links */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: gold }}>
                {t('footerSupport')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Link href="/legal/tokushoho" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" sx={linkSx}>
                    {t('footerLegal')}
                  </Typography>
                </Link>
              </Box>
            </Grid>
          </Grid>

          <Box
            sx={{
              mt: 4,
              pt: 3,
              borderTop: '1px solid rgba(251, 192, 45, 0.1)',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)' }}>
              © {new Date().getFullYear()} もも娘. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Back to Top */}
      {showBackToTop && (
        <IconButton
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={t('footerBackToTop')}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            width: 48,
            height: 48,
            backgroundColor: 'rgba(251, 192, 45, 0.15)',
            border: `1px solid ${gold}`,
            color: gold,
            zIndex: 200,
            '&:hover': { backgroundColor: 'rgba(251, 192, 45, 0.3)' },
          }}
        >
          <KeyboardArrowUpIcon />
        </IconButton>
      )}
    </>
  );
}
