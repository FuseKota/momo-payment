import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

// =====================
// 配送専用商品 (Shipping Only)
// =====================
const shippingProducts = [
  {
    slug: 'rurohan-frozen',
    kind: 'FROZEN_FOOD',
    name: '【配送】冷凍魯肉飯（2食入）',
    description: '本格台湾魯肉飯を冷凍でお届け。八角香る豚バラ肉の煮込みをご家庭で簡単に楽しめます。電子レンジで温めるだけでお店の味が再現できます。',
    price_yen: 1200,
    can_pickup: false,
    can_ship: true,
    temp_zone: 'FROZEN',
    stock_qty: 50,
    image_url: '/images/rurohan.jpg',
    food_label: {
      ingredients: '豚バラ肉、醤油、砂糖、米酒、八角、五香粉、にんにく、エシャロット',
      allergens: '小麦、大豆、豚肉',
      nutrition: { calories: 450, protein: 18, fat: 28, carbohydrates: 32, sodium: 890 },
      net_weight_grams: 300,
      expiry_info: '製造日より6ヶ月（冷凍保存）',
      storage_method: '-18℃以下で保存してください',
      manufacturer: 'もも娘',
    },
    is_active: true,
    sort_order: 1,
  },
  {
    slug: 'rurohan-frozen-set',
    kind: 'FROZEN_FOOD',
    name: '【配送】冷凍魯肉飯セット（4食入）',
    description: 'お得な4食入りセット。ご家族やお友達とシェアして楽しめます。まとめ買いでさらにお得！',
    price_yen: 2200,
    can_pickup: false,
    can_ship: true,
    temp_zone: 'FROZEN',
    stock_qty: 30,
    image_url: '/images/rurohan-set.jpg',
    food_label: {
      ingredients: '豚バラ肉、醤油、砂糖、米酒、八角、五香粉、にんにく、エシャロット',
      allergens: '小麦、大豆、豚肉',
      nutrition: { calories: 450, protein: 18, fat: 28, carbohydrates: 32, sodium: 890 },
      net_weight_grams: 600,
      expiry_info: '製造日より6ヶ月（冷凍保存）',
      storage_method: '-18℃以下で保存してください',
      manufacturer: 'もも娘',
    },
    is_active: true,
    sort_order: 2,
  },
  {
    slug: 'momo-tshirt-ship',
    kind: 'GOODS',
    name: '【配送】もも娘オリジナルTシャツ',
    description: 'もも娘ロゴ入りのオリジナルTシャツ。やわらかい肌触りの綿100%素材。サイズはMとLをご用意。',
    price_yen: 3500,
    can_pickup: false,
    can_ship: true,
    temp_zone: 'AMBIENT',
    stock_qty: 20,
    image_url: '/images/tshirt.jpg',
    food_label: null,
    is_active: true,
    sort_order: 10,
  },
  {
    slug: 'momo-towel',
    kind: 'GOODS',
    name: '【配送】もも娘フェイスタオル',
    description: 'ふわふわ肌触りの今治タオル。もも娘の刺繍入り。毎日使えるかわいいタオルです。',
    price_yen: 1800,
    can_pickup: false,
    can_ship: true,
    temp_zone: 'AMBIENT',
    stock_qty: 40,
    image_url: '/images/towel.jpg',
    food_label: null,
    is_active: true,
    sort_order: 11,
  },
  {
    slug: 'momo-sticker',
    kind: 'GOODS',
    name: '【配送】もも娘ステッカーセット',
    description: 'かわいいもも娘イラストのステッカー5枚セット。防水加工で長持ち。',
    price_yen: 500,
    can_pickup: false,
    can_ship: true,
    temp_zone: 'AMBIENT',
    stock_qty: 100,
    image_url: '/images/stickers.jpg',
    food_label: null,
    is_active: true,
    sort_order: 12,
  },
];

// =====================
// 店頭受取専用商品 (Pickup Only)
// =====================
const pickupProducts = [
  {
    slug: 'karaage-5pc',
    kind: 'GOODS',
    name: '唐揚げ5個',
    description: 'サクサクジューシーな台湾風唐揚げ。スパイシーな味付けがクセになる人気メニュー。',
    price_yen: 500,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: null,
    image_url: '/images/pickup/karaage.jpg',
    food_label: null,
    is_active: true,
    sort_order: 101,
  },
  {
    slug: 'tapioca-milk-tea',
    kind: 'GOODS',
    name: 'タピオカミルクティー',
    description: 'もちもちタピオカ入りの本格台湾ミルクティー。甘さ控えめで飲みやすい。',
    price_yen: 500,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: null,
    image_url: '/images/pickup/tapioca.jpg',
    food_label: null,
    is_active: true,
    sort_order: 102,
  },
  {
    slug: 'rurohan-single',
    kind: 'GOODS',
    name: 'ルーローハン 単品',
    description: '八角香る豚バラ煮込みをご飯にのせた台湾の定番丼。とろとろの豚肉が絶品。',
    price_yen: 800,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: null,
    image_url: '/images/pickup/rurohan.jpg',
    food_label: null,
    is_active: true,
    sort_order: 103,
  },
  {
    slug: 'rurohan-set',
    kind: 'GOODS',
    name: 'ルーローハン＋ウーロン茶セット',
    description: 'ルーローハンとさっぱりウーロン茶のお得なセット。',
    price_yen: 1000,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: null,
    image_url: '/images/pickup/rurohan-set.jpg',
    food_label: null,
    is_active: true,
    sort_order: 104,
  },
  {
    slug: 'jirohan-single',
    kind: 'GOODS',
    name: 'ヂーローハン 単品',
    description: '台湾風蒸し鶏をご飯にのせたヘルシー丼。特製タレが決め手。',
    price_yen: 800,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: null,
    image_url: '/images/pickup/jirohan.jpg',
    food_label: null,
    is_active: true,
    sort_order: 105,
  },
  {
    slug: 'jirohan-set',
    kind: 'GOODS',
    name: 'ヂーローハン＋ウーロン茶セット',
    description: 'ヂーローハンとさっぱりウーロン茶のお得なセット。',
    price_yen: 1000,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: null,
    image_url: '/images/pickup/jirohan-set.jpg',
    food_label: null,
    is_active: true,
    sort_order: 106,
  },
  {
    slug: 'taiwan-beer',
    kind: 'GOODS',
    name: '台湾ビール',
    description: '台湾を代表するラガービール。すっきりとした味わい。',
    price_yen: 450,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: null,
    image_url: '/images/pickup/taiwan-beer.jpg',
    food_label: null,
    is_active: true,
    sort_order: 107,
  },
  {
    slug: 'pineapple-cake',
    kind: 'GOODS',
    name: '台湾パイナップルケーキ',
    description: '台湾土産の定番。サクサク生地と甘酸っぱいパイナップル餡。',
    price_yen: 150,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: null,
    image_url: '/images/pickup/pineapple-cake.jpg',
    food_label: null,
    is_active: true,
    sort_order: 108,
  },
  {
    slug: 'tshirt-light',
    kind: 'GOODS',
    name: 'Tシャツ 薄手',
    description: 'もも娘オリジナルTシャツ（薄手）。夏にぴったりの軽やかな着心地。',
    price_yen: 2000,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: 30,
    image_url: '/images/pickup/tshirt-light.jpg',
    food_label: null,
    is_active: true,
    sort_order: 109,
  },
  {
    slug: 'tshirt-heavy',
    kind: 'GOODS',
    name: 'Tシャツ 厚手',
    description: 'もも娘オリジナルTシャツ（厚手）。しっかりした生地で長く使える。',
    price_yen: 2500,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: 20,
    image_url: '/images/pickup/tshirt-heavy.jpg',
    food_label: null,
    is_active: true,
    sort_order: 110,
  },
  {
    slug: 'keychain',
    kind: 'GOODS',
    name: 'キーホルダー',
    description: 'もも娘オリジナルキーホルダー。かわいいデザインで毎日持ち歩きたくなる。',
    price_yen: 800,
    can_pickup: true,
    can_ship: false,
    temp_zone: 'AMBIENT',
    stock_qty: 50,
    image_url: '/images/pickup/keychain.jpg',
    food_label: null,
    is_active: true,
    sort_order: 111,
  },
];

const allProducts = [...shippingProducts, ...pickupProducts];

async function seed() {
  console.log('Seeding products...');
  console.log('');

  console.log('--- 配送専用商品 ---');
  for (const product of shippingProducts) {
    const { error } = await supabase.from('products').upsert(product, {
      onConflict: 'slug',
    });

    if (error) {
      console.error(`✗ ${product.name}:`, error.message);
    } else {
      console.log(`✓ ${product.name}`);
    }
  }

  console.log('');
  console.log('--- 店頭受取専用商品 ---');
  for (const product of pickupProducts) {
    const { error } = await supabase.from('products').upsert(product, {
      onConflict: 'slug',
    });

    if (error) {
      console.error(`✗ ${product.name}:`, error.message);
    } else {
      console.log(`✓ ${product.name}`);
    }
  }

  console.log('');
  console.log(`Done! Total: ${allProducts.length} products`);
}

seed().catch(console.error);
