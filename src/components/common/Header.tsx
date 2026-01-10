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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HomeIcon from '@mui/icons-material/Home';
import LanguageIcon from '@mui/icons-material/Language';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';

interface HeaderProps {
  cartItemCount?: number;
}

export default function Header({ cartItemCount = 0 }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navItems = [
    { label: 'ホーム', href: '/', icon: <HomeIcon /> },
    { label: 'キッチンカー販売', href: '/pickup', icon: <StorefrontIcon /> },
    { label: '配送注文', href: '/shop', icon: <LocalShippingIcon /> },
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
            <Box
              sx={{
                width: { xs: 48, md: 56 },
                height: { xs: 48, md: 56 },
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF859A 0%, #FF6680 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
              }}
            >
              <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.8rem' } }}>🍑</Typography>
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
              もも娘
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
              <IconButton
                component="a"
                href="https://sakura-sisters.com/momo-musume/"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main', backgroundColor: 'rgba(255, 102, 128, 0.08)' },
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
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main', backgroundColor: 'rgba(255, 102, 128, 0.08)' },
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
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main', backgroundColor: 'rgba(255, 102, 128, 0.08)' },
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
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main', backgroundColor: 'rgba(255, 102, 128, 0.08)' },
                }}
              >
                <YouTubeIcon />
              </IconButton>
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
          <Box sx={{ px: 2, pb: 2, display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF859A 0%, #FF6680 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 1.5,
              }}
            >
              <Typography sx={{ fontSize: '1rem' }}>🍑</Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              もも娘
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
          <Box sx={{ px: 2, pt: 2, display: 'flex', gap: 1 }}>
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
        </Box>
      </Drawer>
    </>
  );
}
