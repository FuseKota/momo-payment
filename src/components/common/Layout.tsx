'use client';

import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  cartItemCount?: number;
  showFooter?: boolean;
}

export default function Layout({
  children,
  cartItemCount = 0,
  showFooter = true,
}: LayoutProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Header cartItemCount={cartItemCount} />
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
      {showFooter && <Footer />}
    </Box>
  );
}
