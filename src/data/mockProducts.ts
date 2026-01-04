import type { Product } from '@/types/database';

// Mock products for development
// In production, these will come from Supabase

export const mockProducts: Product[] = [
  {
    id: '1',
    slug: 'rurohan-frozen',
    kind: 'FROZEN_FOOD',
    name: '冷凍魯肉飯（2食入）',
    description: '本格台湾魯肉飯を冷凍でお届け。八角香る豚バラ肉の煮込みをご家庭で簡単に楽しめます。電子レンジで温めるだけでお店の味が再現できます。',
    price_yen: 1200,
    can_pickup: true,
    can_ship: true,
    temp_zone: 'FROZEN',
    stock_qty: 50,
    image_url: '/images/rurohan.jpg',
    food_label: {
      ingredients: '豚バラ肉、醤油、砂糖、米酒、八角、五香粉、にんにく、エシャロット',
      allergens: '小麦、大豆、豚肉',
      nutrition: {
        calories: 450,
        protein: 18,
        fat: 28,
        carbohydrates: 32,
        sodium: 890,
      },
      net_weight_grams: 300,
      expiry_info: '製造日より6ヶ月（冷凍保存）',
      storage_method: '-18℃以下で保存してください',
      manufacturer: 'もも娘',
    },
    is_active: true,
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    slug: 'rurohan-frozen-set',
    kind: 'FROZEN_FOOD',
    name: '冷凍魯肉飯セット（4食入）',
    description: 'お得な4食入りセット。ご家族やお友達とシェアして楽しめます。まとめ買いでさらにお得！',
    price_yen: 2200,
    can_pickup: true,
    can_ship: true,
    temp_zone: 'FROZEN',
    stock_qty: 30,
    image_url: '/images/rurohan-set.jpg',
    food_label: {
      ingredients: '豚バラ肉、醤油、砂糖、米酒、八角、五香粉、にんにく、エシャロット',
      allergens: '小麦、大豆、豚肉',
      nutrition: {
        calories: 450,
        protein: 18,
        fat: 28,
        carbohydrates: 32,
        sodium: 890,
      },
      net_weight_grams: 600,
      expiry_info: '製造日より6ヶ月（冷凍保存）',
      storage_method: '-18℃以下で保存してください',
      manufacturer: 'もも娘',
    },
    is_active: true,
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    slug: 'momo-tshirt',
    kind: 'GOODS',
    name: 'もも娘オリジナルTシャツ',
    description: 'もも娘ロゴ入りのオリジナルTシャツ。やわらかい肌触りの綿100%素材。サイズはMとLをご用意。',
    price_yen: 3500,
    can_pickup: true,
    can_ship: true,
    temp_zone: 'AMBIENT',
    stock_qty: 20,
    image_url: '/images/tshirt.jpg',
    food_label: null,
    is_active: true,
    sort_order: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    slug: 'momo-towel',
    kind: 'GOODS',
    name: 'もも娘フェイスタオル',
    description: 'ふわふわ肌触りの今治タオル。もも娘の刺繍入り。毎日使えるかわいいタオルです。',
    price_yen: 1800,
    can_pickup: true,
    can_ship: true,
    temp_zone: 'AMBIENT',
    stock_qty: 40,
    image_url: '/images/towel.jpg',
    food_label: null,
    is_active: true,
    sort_order: 11,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '5',
    slug: 'momo-sticker',
    kind: 'GOODS',
    name: 'もも娘ステッカーセット',
    description: 'かわいいもも娘イラストのステッカー5枚セット。防水加工で長持ち。',
    price_yen: 500,
    can_pickup: true,
    can_ship: true,
    temp_zone: 'AMBIENT',
    stock_qty: 100,
    image_url: '/images/stickers.jpg',
    food_label: null,
    is_active: true,
    sort_order: 12,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return mockProducts.find((p) => p.slug === slug);
}

export function getProductsByKind(kind: 'FROZEN_FOOD' | 'GOODS'): Product[] {
  return mockProducts.filter((p) => p.kind === kind && p.is_active);
}

export function getShippableProducts(): Product[] {
  return mockProducts.filter((p) => p.can_ship && p.is_active);
}
