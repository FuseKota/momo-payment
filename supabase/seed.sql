-- Seed data for momo-payment
-- Run this after migration: supabase db push

-- Initial product data
INSERT INTO public.products (slug, kind, name, description, price_yen, can_pickup, can_ship, temp_zone, stock_qty, image_url, food_label, is_active, sort_order)
VALUES
  ('rurohan-frozen', 'FROZEN_FOOD', '冷凍魯肉飯（2食入）', '本格台湾魯肉飯を冷凍でお届け。八角香る豚バラ肉の煮込みをご家庭で簡単に楽しめます。電子レンジで温めるだけでお店の味が再現できます。', 1200, true, true, 'FROZEN', 50, '/images/rurohan.jpg',
    '{"ingredients": "豚バラ肉、醤油、砂糖、米酒、八角、五香粉、にんにく、エシャロット", "allergens": "小麦、大豆、豚肉", "nutrition": {"calories": 450, "protein": 18, "fat": 28, "carbohydrates": 32, "sodium": 890}, "net_weight_grams": 300, "expiry_info": "製造日より6ヶ月（冷凍保存）", "storage_method": "-18℃以下で保存してください", "manufacturer": "もも娘"}',
    true, 1),
  ('rurohan-frozen-set', 'FROZEN_FOOD', '冷凍魯肉飯セット（4食入）', 'お得な4食入りセット。ご家族やお友達とシェアして楽しめます。まとめ買いでさらにお得！', 2200, true, true, 'FROZEN', 30, '/images/rurohan-set.jpg',
    '{"ingredients": "豚バラ肉、醤油、砂糖、米酒、八角、五香粉、にんにく、エシャロット", "allergens": "小麦、大豆、豚肉", "nutrition": {"calories": 450, "protein": 18, "fat": 28, "carbohydrates": 32, "sodium": 890}, "net_weight_grams": 600, "expiry_info": "製造日より6ヶ月（冷凍保存）", "storage_method": "-18℃以下で保存してください", "manufacturer": "もも娘"}',
    true, 2),
  ('momo-tshirt', 'GOODS', 'もも娘オリジナルTシャツ', 'もも娘ロゴ入りのオリジナルTシャツ。やわらかい肌触りの綿100%素材。サイズはMとLをご用意。', 3500, true, true, 'AMBIENT', 20, '/images/tshirt.jpg', NULL, true, 10),
  ('momo-towel', 'GOODS', 'もも娘フェイスタオル', 'ふわふわ肌触りの今治タオル。もも娘の刺繍入り。毎日使えるかわいいタオルです。', 1800, true, true, 'AMBIENT', 40, '/images/towel.jpg', NULL, true, 11),
  ('momo-sticker', 'GOODS', 'もも娘ステッカーセット', 'かわいいもも娘イラストのステッカー5枚セット。防水加工で長持ち。', 500, true, true, 'AMBIENT', 100, '/images/stickers.jpg', NULL, true, 12)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_yen = EXCLUDED.price_yen,
  stock_qty = EXCLUDED.stock_qty,
  food_label = EXCLUDED.food_label;
