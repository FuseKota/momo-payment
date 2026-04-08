'use client';

import { useState } from 'react';
import Image from 'next/image';
import NextLink from 'next/link';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Badge,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HomeIcon from '@mui/icons-material/Home';
import ArticleIcon from '@mui/icons-material/Article';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import NightlifeIcon from '@mui/icons-material/Nightlife';
import LanguageIcon from '@mui/icons-material/Language';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { useAuth } from '@/contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  cartItemCount?: number;
}

export default function Header({ cartItemCount = 0 }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAdmin, signOut } = useAuth();
  const t = useTranslations('common');

  const navItems = [
    { label: t('home'), href: '/' as const, icon: <HomeIcon /> },
    { label: t('news'), href: '/news' as const, icon: <ArticleIcon /> },
    { label: t('shipping'), href: '/shop' as const, icon: <LocalShippingIcon /> },
    { label: t('taiwanNightMarket'), href: '/taiwan-night-market' as const, icon: <NightlifeIcon /> },
  ];

  const socialLinks = [
    { href: 'https://sakura-sisters.com/momo-musume/', icon: <LanguageIcon /> },
    { href: 'https://www.instagram.com/momomusume_fukushima_official/', icon: <InstagramIcon /> },
    { href: 'https://x.com/momomusume_jp', icon: <XIcon /> },
    { href: 'https://www.youtube.com/@%E7%A6%8F%E5%B3%B6%E3%82%82%E3%82%82%E5%A8%98%E5%85%AC%E5%BC%8F', icon: <YouTubeIcon /> },
  ];

  return (
    <>
      <AppBar position="static" color="inherit" elevation={0}>
        <Toolbar
          sx={{
            maxWidth: 1200,
            width: '100%',
            mx: 'auto',
            px: { xs: 2, md: 4 },
            minHeight: { xs: 70, md: 80 },
            py: 1,
          }}
        >
          {isMobile && (
            <IconButton
              edge="start"
              color="primary"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 1 }}
              size="large"
            >
              <MenuIcon sx={{ fontSize: 28 }} />
            </IconButton>
          )}

          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Box sx={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
              <Image
                src="/images/logo.svg"
                alt="Sakura Sisters"
                fill
                style={{ objectFit: 'contain' }}
              />
            </Box>
            <Typography
              variant="h5"
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.3rem', md: '1.5rem' },
                background: 'linear-gradient(135deg, #FF6680 0%, #E84D6A 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('siteName')}
            </Typography>
          </Link>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, ml: 2, flexShrink: 0 }}>
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  color="inherit"
                  startIcon={item.icon}
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.85rem',
                    px: 1.2,
                    py: 0.5,
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    '&:hover': {
                      color: 'primary.main',
                      backgroundColor: 'rgba(255, 102, 128, 0.08)',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Social Links - lg以上のみ表示 */}
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
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main', backgroundColor: 'rgba(255, 102, 128, 0.08)' },
                  }}
                >
                  {link.icon}
                </IconButton>
              ))}
            </Box>
          )}

          {/* Language Switcher */}
          <Box sx={{ ml: { xs: 0, md: 1 } }}>
            <LanguageSwitcher />
          </Box>

          {/* Auth buttons - Desktop only */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
              {user ? (
                <>
                  <Button
                    component={Link}
                    href="/mypage"
                    size="small"
                    startIcon={<PersonIcon />}
                    sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                  >
                    {t('mypage')}
                  </Button>
                  <IconButton
                    onClick={signOut}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    <LogoutIcon />
                  </IconButton>
                </>
              ) : (
                <Button
                  component={Link}
                  href="/login"
                  size="small"
                  startIcon={<PersonIcon />}
                  sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                >
                  {t('login')}
                </Button>
              )}
            </Box>
          )}

          <IconButton
            component={Link}
            href="/cart"
            color="primary"
            size="large"
            sx={{ ml: { xs: 1, md: 2 } }}
          >
            <Badge badgeContent={cartItemCount} color="secondary">
              <ShoppingCartIcon sx={{ fontSize: 28 }} />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 280, pt: 2 }}>
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {t('siteName')}
            </Typography>
          </Box>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                >
                  <ListItemIcon sx={{ color: 'primary.main' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 1 }} />

          {/* Auth section in drawer */}
          <List>
            {user ? (
              <>
                {isAdmin && (
                  <ListItem disablePadding>
                    <ListItemButton
                      component={NextLink}
                      href="/admin/orders"
                      onClick={() => setDrawerOpen(false)}
                    >
                      <ListItemIcon sx={{ color: 'primary.main' }}>
                        <AdminPanelSettingsIcon />
                      </ListItemIcon>
                      <ListItemText primary={t('admin')} />
                    </ListItemButton>
                  </ListItem>
                )}
                <ListItem disablePadding>
                  <ListItemButton
                    component={Link}
                    href="/mypage"
                    onClick={() => setDrawerOpen(false)}
                  >
                    <ListItemIcon sx={{ color: 'primary.main' }}>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary={t('mypage')} />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      signOut();
                      setDrawerOpen(false);
                    }}
                  >
                    <ListItemIcon sx={{ color: 'primary.main' }}>
                      <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText primary={t('logout')} />
                  </ListItemButton>
                </ListItem>
              </>
            ) : (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                >
                  <ListItemIcon sx={{ color: 'primary.main' }}>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText primary={t('login')} />
                </ListItemButton>
              </ListItem>
            )}
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
                sx={{
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'rgba(255, 102, 128, 0.1)' },
                }}
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
