'use client';

import { createTheme } from '@mui/material/styles';

// 桃をイメージしたピンク系カラーパレット
const peachPink = {
  50: '#FFF0F3',
  100: '#FFE0E6',
  200: '#FFC2CC',
  300: '#FFA3B3',
  400: '#FF859A',
  500: '#FF6680', // メインカラー
  600: '#E84D6A',
  700: '#D13355',
  800: '#BA1A40',
  900: '#A3002B',
};

const peachAccent = {
  50: '#FFF8E1',
  100: '#FFECB3',
  200: '#FFE082',
  300: '#FFD54F',
  400: '#FFCA28',
  500: '#FFC107', // アクセントカラー（ゴールド）
  600: '#FFB300',
  700: '#FFA000',
  800: '#FF8F00',
  900: '#FF6F00',
};

const theme = createTheme({
  palette: {
    primary: {
      main: peachPink[500],
      light: peachPink[300],
      dark: peachPink[700],
      contrastText: '#fff',
    },
    secondary: {
      main: peachAccent[500],
      light: peachAccent[300],
      dark: peachAccent[700],
      contrastText: '#000',
    },
    background: {
      default: '#FFFBFC',
      paper: '#FFFFFF',
    },
    error: {
      main: '#E53935',
    },
    success: {
      main: '#43A047',
    },
    text: {
      primary: '#37474F',
      secondary: '#78909C',
    },
  },
  typography: {
    fontFamily: [
      '"Noto Sans JP"',
      '"Hiragino Kaku Gothic ProN"',
      '"Hiragino Sans"',
      'Meiryo',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.1rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.7,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 24,
          padding: '10px 24px',
          fontSize: '1rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(255, 102, 128, 0.3)',
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${peachPink[400]} 0%, ${peachPink[500]} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${peachPink[500]} 0%, ${peachPink[600]} 100%)`,
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(255, 102, 128, 0.1)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 30px rgba(255, 102, 128, 0.15)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'medium',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: peachPink[300],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: peachPink[500],
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        colorPrimary: {
          background: `linear-gradient(135deg, ${peachPink[100]} 0%, ${peachPink[200]} 100%)`,
          color: peachPink[700],
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 20px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

export default theme;
