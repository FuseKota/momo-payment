'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HomeIcon from '@mui/icons-material/Home';
import NightlifeIcon from '@mui/icons-material/Nightlife';
import LanguageIcon from '@mui/icons-material/Language';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

const gold = '#fbc02d';
const goldHover = 'rgba(251, 192, 45, 0.12)';
const darkBg = 'rgba(5, 0, 5, 0.95)';
const borderGold = 'rgba(251, 192, 45, 0.3)';

const socialLinks = [
  { href: 'https://sakura-sisters.com/momo-musume/', icon: <LanguageIcon /> },
  { href: 'https://www.instagram.com/momomusume_fukushima_official/', icon: <InstagramIcon /> },
  { href: 'https://x.com/momomusume_jp', icon: <XIcon /> },
  { href: 'https://www.youtube.com/@%E7%A6%8F%E5%B3%B6%E3%82%82%E3%82%82%E5%A8%98%E5%85%AC%E5%BC%8F', icon: <YouTubeIcon /> },
];

export default function TaiwanNightMarketHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const t = useTranslations('common');

  const navItems = [
    { label: t('home'), href: '/' as const, icon: <HomeIcon /> },
    { label: t('shipping'), href: '/shop' as const, icon: <LocalShippingIcon /> },
    { label: t('taiwanNightMarket'), href: '/taiwan-night-market' as const, icon: <NightlifeIcon /> },
  ];

  const iconBtnSx = {
    color: '#aaa',
    '&:hover': { color: gold, backgroundColor: goldHover },
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: darkBg,
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${borderGold}`,
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1200,
            width: '100%',
            mx: 'auto',
            px: { xs: 2, md: 4 },
            minHeight: { xs: 64, md: 64 },
          }}
        >
          {isMobile && (
            <IconButton
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 1, color: gold }}
              size="large"
            >
              <MenuIcon sx={{ fontSize: 28 }} />
            </IconButton>
          )}

          {/* Logo */}
          <Link href="/taiwan-night-market" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Typography
              variant="h5"
              component="span"
              sx={{
                fontWeight: 700,
                fontFamily: "'Noto Serif JP', serif",
                fontSize: { xs: '1.1rem', md: '1.2rem' },
                background: 'linear-gradient(135deg, #fbc02d, #ff5252)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                whiteSpace: 'nowrap',
              }}
            >
              🏮福島もも娘台湾夜市サイト
            </Typography>
          </Link>

          {/* Desktop Nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, ml: 2, flexShrink: 0 }}>
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  startIcon={item.icon}
                  size="small"
                  sx={{
                    color: '#ccc',
                    fontSize: '0.85rem',
                    px: 1.2,
                    py: 0.5,
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    '&:hover': { color: gold, backgroundColor: goldHover },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Social Links — lg以上のみ表示 */}
          {!isMobile && (
            <Box sx={{ display: { md: 'none', lg: 'flex' }, gap: 0.5, ml: 1 }}>
              {socialLinks.map((link) => (
                <IconButton
                  key={link.href}
                  component="a"
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  sx={iconBtnSx}
                >
                  {link.icon}
                </IconButton>
              ))}
            </Box>
          )}

          {/* Language Switcher */}
          <Box sx={{ ml: 1 }}>
            <LanguageSwitcher />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { backgroundColor: '#0a0005', color: '#f5f5f5', width: 280 } }}
      >
        <Box sx={{ pt: 2 }}>
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontFamily: "'Noto Serif JP', serif",
                background: 'linear-gradient(135deg, #fbc02d, #ff5252)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              🏮福島もも娘台湾夜市サイト
            </Typography>
          </Box>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  sx={{ '&:hover': { backgroundColor: goldHover } }}
                >
                  <ListItemIcon sx={{ color: gold }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} sx={{ color: '#f5f5f5' }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Box sx={{ px: 2, pt: 2, display: 'flex', gap: 1 }}>
            {socialLinks.map((link) => (
              <IconButton
                key={link.href}
                component="a"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ color: gold, '&:hover': { backgroundColor: goldHover } }}
              >
                {link.icon}
              </IconButton>
            ))}
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
