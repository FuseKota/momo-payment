'use client';

import {
  Box,
  Typography,
  Paper,
  Chip,
  Switch,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { formatPrice } from '@/lib/utils/format';
import { peachPink } from '@/lib/mui/theme';
import type { Product } from '@/types/database';

interface ProductTableProps {
  products: Product[];
  orderedProducts: Product[];
  isReorderMode: boolean;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onToggleActive: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

/** 商品一覧テーブル（通常表示／並び替えモード）の表示・操作専用コンポーネント */
export default function ProductTable({
  products,
  orderedProducts,
  isReorderMode,
  onMove,
  onToggleActive,
  onEdit,
  onDelete,
}: ProductTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {isReorderMode && <TableCell sx={{ width: 80 }}>順番</TableCell>}
            <TableCell>商品名</TableCell>
            <TableCell>種別</TableCell>
            <TableCell align="right">価格</TableCell>
            <TableCell align="center">公開</TableCell>
            {!isReorderMode && <TableCell align="center">操作</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {(isReorderMode ? orderedProducts : products).map((product, index) => (
            <TableRow key={product.id} hover>
              {isReorderMode && (
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Tooltip title="上へ">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => onMove(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                      {index + 1}
                    </Typography>
                    <Tooltip title="下へ">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => onMove(index, 'down')}
                          disabled={index === orderedProducts.length - 1}
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </TableCell>
              )}
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {product.image_url ? (
                    <Box
                      component="img"
                      src={product.image_url}
                      alt={product.name}
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: peachPink[50],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography sx={{ fontSize: '1.5rem' }}>
                        {product.kind === 'FROZEN_FOOD' ? '🍚' : '🎁'}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {product.slug}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                {product.temp_zone === 'FROZEN' ? (
                  <Chip
                    icon={<AcUnitIcon />}
                    label="冷凍食品"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ) : (
                  <Chip label="グッズ" size="small" variant="outlined" />
                )}
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ fontWeight: 600 }}>¥{formatPrice(product.price_yen)}</Typography>
              </TableCell>
              <TableCell align="center">
                <Switch
                  checked={product.is_active}
                  onChange={() => onToggleActive(product)}
                  color="primary"
                  disabled={isReorderMode}
                />
              </TableCell>
              {!isReorderMode && (
                <TableCell align="center">
                  <IconButton size="small" color="primary" onClick={() => onEdit(product)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(product.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
          {products.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                <Typography color="text.secondary">商品がありません</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
