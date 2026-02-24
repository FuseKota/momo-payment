'use client';

import { Box, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface QuantityControlProps {
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disableIncrement?: boolean;
  disableDecrement?: boolean;
  /** inline = カード内（primary border）、standard = カート内（divider border） */
  variant?: 'inline' | 'standard';
  size?: 'small' | 'medium';
}

export default function QuantityControl({
  qty,
  onIncrement,
  onDecrement,
  disableIncrement = false,
  disableDecrement = false,
  variant = 'inline',
  size = 'small',
}: QuantityControlProps) {
  const isInline = variant === 'inline';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        border: isInline ? '2px solid' : '1px solid',
        borderColor: isInline ? 'primary.main' : 'divider',
        borderRadius: isInline ? 2 : 1,
      }}
    >
      <IconButton
        size={size}
        onClick={onDecrement}
        disabled={disableDecrement}
        sx={isInline ? { color: 'primary.main' } : undefined}
      >
        <RemoveIcon fontSize={size} />
      </IconButton>
      <Typography
        sx={{
          px: isInline ? 1 : 2,
          fontWeight: 600,
          minWidth: isInline ? 24 : 32,
          textAlign: 'center',
        }}
      >
        {qty}
      </Typography>
      <IconButton
        size={size}
        onClick={onIncrement}
        disabled={disableIncrement}
        sx={isInline ? { color: 'primary.main' } : undefined}
      >
        <AddIcon fontSize={size} />
      </IconButton>
    </Box>
  );
}
