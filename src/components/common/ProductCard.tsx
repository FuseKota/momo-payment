'use client';

import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Link } from '@/i18n/navigation';
import { formatPrice } from '@/lib/utils/format';
import { getLocalizedName, getLocalizedDescription } from '@/lib/utils/localize-product';
import QuantityControl from './QuantityControl';
import type { Product } from '@/types/database';

interface ProductCardProps {
  product: Product;
  locale: string;
  cartQty: number;
  onAdd: () => void;
  onUpdateQty: (delta: number) => void;
  disabled?: boolean;
  /** バリアント選択リンク（商品詳細へ遷移） */
  variantLink?: string;
  variantLinkLabel?: string;
  addLabel: string;
  isOutOfStock?: boolean;
  outOfStockLabel?: string;
  /** 商品詳細リンク（shop は有り、pickup は無し） */
  detailLink?: string;
  imageHeight?: number;
}

export default function ProductCard({
  product,
  locale,
  cartQty,
  onAdd,
  onUpdateQty,
  disabled = false,
  variantLink,
  variantLinkLabel,
  addLabel,
  isOutOfStock = false,
  outOfStockLabel,
  detailLink,
  imageHeight = 180,
}: ProductCardProps) {
  const name = getLocalizedName(product, locale);
  const description = getLocalizedDescription(product, locale);
  const emoji = product.kind === 'FROZEN_FOOD' ? '🍚' : '🎁';

  const imageContent = product.image_url ? (
    <CardMedia
      component="img"
      image={product.image_url}
      alt={name}
      sx={{ height: imageHeight, objectFit: 'cover' }}
    />
  ) : (
    <CardMedia
      sx={{
        height: imageHeight,
        backgroundColor: '#FFF0F3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography sx={{ fontSize: '4rem' }}>{emoji}</Typography>
    </CardMedia>
  );

  const actionButton = (() => {
    if (variantLink && variantLinkLabel) {
      return (
        <Button
          component={Link}
          href={variantLink}
          variant="outlined"
          size="small"
        >
          {variantLinkLabel}
        </Button>
      );
    }
    if (cartQty > 0) {
      return (
        <QuantityControl
          qty={cartQty}
          onDecrement={() => onUpdateQty(-1)}
          onIncrement={() => onUpdateQty(1)}
          variant="inline"
          size="small"
        />
      );
    }
    return (
      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={onAdd}
        disabled={disabled || isOutOfStock}
      >
        {addLabel}
      </Button>
    );
  })();

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {detailLink ? (
        <Link href={detailLink} style={{ textDecoration: 'none' }}>
          {imageContent}
        </Link>
      ) : (
        imageContent
      )}

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isOutOfStock && outOfStockLabel && (
          <Chip label={outOfStockLabel} color="error" size="small" sx={{ mb: 1, alignSelf: 'flex-start' }} />
        )}

        {detailLink ? (
          <Link href={detailLink} style={{ textDecoration: 'none' }}>
            <Typography
              variant="h6"
              sx={{
                mb: 1,
                fontWeight: 700,
                color: 'text.primary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {name}
            </Typography>
          </Link>
        ) : (
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            {name}
          </Typography>
        )}

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: 'primary.main', fontWeight: 700 }}
          >
            ¥{formatPrice(product.price_yen)}
          </Typography>
          {actionButton}
        </Box>
      </CardContent>
    </Card>
  );
}
