'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LanguageIcon from '@mui/icons-material/Language';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  cartItemCount?: number;
}

export default function Header({ cartItemCount = 0 }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAdmin, signOut } = useAuth();

  const navItems = [
    { label: 'ホーム', href: '/', icon: <HomeIcon /> },
    { label: 'キッチンカー販売', href: '/pickup', icon: <StorefrontIcon /> },
    { label: '配送注文', href: '/shop', icon: <LocalShippingIcon /> },
  ];

  const socialLinks = [
    { href: 'https://sakura-sisters.com/momo-musume/', icon: <LanguageIcon /> },
    { href: 'https://www.instagram.com/momomusume_fukushima_official/', icon: <InstagramIcon /> },
    { href: 'https://x.com/momomusume_jp', icon: <XIcon /> },
    { href: 'https://www.youtube.com/@%E7%A6%8F%E5%B3%B6%E3%82%82%E3%82%82%E5%A8%98%E5%85%AC%E5%BC%8F', icon: <YouTubeIcon /> },
  ];

  return (
    <>
      <AppBar position="sticky" color="inherit" elevation={0}>
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

          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
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
              福島もも娘物販サイト
            </Typography>
          </Link>

          <Box sx={{ flexGrow: 1 }} />

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  color="inherit"
                  startIcon={item.icon}
                  size="large"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '1rem',
                    px: 2.5,
                    py: 1,
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

          {/* Social Links - Desktop only */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
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

          {/* Auth buttons - Desktop only */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
              {user ? (
                <>
                  {isAdmin && (
                    <Button
                      component={Link}
                      href="/admin/orders"
                      size="small"
                      startIcon={<AdminPanelSettingsIcon />}
                      sx={{ color: 'text.secondary' }}
                    >
                      管理画面
                    </Button>
                  )}
                  <Button
                    component={Link}
                    href="/mypage"
                    size="small"
                    startIcon={<PersonIcon />}
                    sx={{ color: 'text.secondary' }}
                  >
                    マイページ
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
                  sx={{ color: 'text.secondary' }}
                >
                  ログイン
                </Button>
              )}
            </Box>
          )}

          <IconButton
            component={Link}
            href="/cart"
            color="primary"
            size="large"
            sx={{ ml: { xs: 1, md: 3 } }}
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
              福島もも娘物販サイト
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
                      component={Link}
                      href="/admin/orders"
                      onClick={() => setDrawerOpen(false)}
                    >
                      <ListItemIcon sx={{ color: 'primary.main' }}>
                        <AdminPanelSettingsIcon />
                      </ListItemIcon>
                      <ListItemText primary="管理画面" />
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
                    <ListItemText primary="マイページ" />
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
                    <ListItemText primary="ログアウト" />
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
                  <ListItemText primary="ログイン" />
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
