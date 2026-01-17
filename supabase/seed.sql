-- Seed data for momo-payment
-- Run this after migration: supabase db push

-- =====================
-- 配送専用商品 (Shipping Only)
-- =====================
INSERT INTO public.products (slug, kind, name, description, price_yen, can_pickup, can_ship, temp_zone, stock_qty, image_url, images, food_label, is_active, sort_order)
VALUES
  ('rurohan-frozen', 'FROZEN_FOOD', '【配送】冷凍魯肉飯（2食入）', NULL, 1200, false, true, 'FROZEN', 50, '/images/rurohan.jpg',
    '["/images/rurohan-detail.jpg"]',
    '{"ingredients": "豚バラ肉、醤油、砂糖、米酒、八角、五香粉、にんにく、エシャロット", "allergens": "小麦、大豆、豚肉", "nutrition": {"calories": 450, "protein": 18, "fat": 28, "carbohydrates": 32, "sodium": 890}, "net_weight_grams": 300, "expiry_info": "製造日より6ヶ月（冷凍保存）", "storage_method": "-18℃以下で保存してください", "manufacturer": "もも娘"}',
    true, 1),
  ('rurohan-frozen-set', 'FROZEN_FOOD', '【配送】冷凍魯肉飯セット（4食入）', NULL, 2200, false, true, 'FROZEN', 30, '/images/rurohan-set.jpg',
    '["/images/rurohan-detail.jpg"]',
    '{"ingredients": "豚バラ肉、醤油、砂糖、米酒、八角、五香粉、にんにく、エシャロット", "allergens": "小麦、大豆、豚肉", "nutrition": {"calories": 450, "protein": 18, "fat": 28, "carbohydrates": 32, "sodium": 890}, "net_weight_grams": 600, "expiry_info": "製造日より6ヶ月（冷凍保存）", "storage_method": "-18℃以下で保存してください", "manufacturer": "もも娘"}',
    true, 2),
  ('momo-tshirt-ship', 'GOODS', '【配送】もも娘黒Tシャツ', NULL, 2500, false, true, 'AMBIENT', 20, '/images/tshirt.jpg', '[]', NULL, true, 10),
  ('momo-towel', 'GOODS', '【配送】もも娘タオル', NULL, 3800, false, true, 'AMBIENT', 40, '/images/towel.jpg', '[]', NULL, true, 11)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_yen = EXCLUDED.price_yen,
  can_pickup = EXCLUDED.can_pickup,
  can_ship = EXCLUDED.can_ship,
  stock_qty = EXCLUDED.stock_qty,
  images = EXCLUDED.images,
  food_label = EXCLUDED.food_label;

-- =====================
-- 店頭受取専用商品 (Pickup Only)
-- =====================
INSERT INTO public.products (slug, kind, name, description, price_yen, can_pickup, can_ship, temp_zone, stock_qty, image_url, images, food_label, is_active, sort_order)
VALUES
  -- フード
  ('karaage-5pc', 'GOODS', '唐揚げ5個', NULL, 500, true, false, 'AMBIENT', NULL, '/images/pickup/karaage.jpg', '[]', NULL, true, 101),
  ('tapioca-milk-tea', 'GOODS', 'タピオカミルクティー', NULL, 500, true, false, 'AMBIENT', NULL, '/images/pickup/tapioca.jpg', '[]', NULL, true, 102),
  ('rurohan-single', 'GOODS', 'ルーローハン 単品', NULL, 800, true, false, 'AMBIENT', NULL, '/images/pickup/rurohan.jpg', '[]', NULL, true, 103),
  ('rurohan-set', 'GOODS', 'ルーローハン＋ウーロン茶セット', NULL, 1000, true, false, 'AMBIENT', NULL, '/images/pickup/rurohan-set.jpg', '[]', NULL, true, 104),
  ('jirohan-single', 'GOODS', 'ヂーローハン 単品', NULL, 800, true, false, 'AMBIENT', NULL, '/images/pickup/jirohan.jpg', '[]', NULL, true, 105),
  ('jirohan-set', 'GOODS', 'ヂーローハン＋ウーロン茶セット', NULL, 1000, true, false, 'AMBIENT', NULL, '/images/pickup/jirohan-set.jpg', '[]', NULL, true, 106),
  ('taiwan-beer', 'GOODS', '台湾ビール', NULL, 450, true, false, 'AMBIENT', NULL, '/images/pickup/taiwan-beer.jpg', '[]', NULL, true, 107),
  ('pineapple-cake', 'GOODS', '台湾パイナップルケーキ', NULL, 150, true, false, 'AMBIENT', NULL, '/images/pickup/pineapple-cake.jpg', '[]', NULL, true, 108),
  -- グッズ
  ('tshirt-light', 'GOODS', 'Tシャツ 薄手', NULL, 2000, true, false, 'AMBIENT', 30, '/images/pickup/tshirt-light.jpg', '[]', NULL, true, 109),
  ('tshirt-heavy', 'GOODS', 'Tシャツ 厚手', NULL, 2500, true, false, 'AMBIENT', 20, '/images/pickup/tshirt-heavy.jpg', '[]', NULL, true, 110),
  ('keychain', 'GOODS', 'キーホルダー', NULL, 800, true, false, 'AMBIENT', 50, '/images/pickup/keychain.jpg', '[]', NULL, true, 111)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_yen = EXCLUDED.price_yen,
  can_pickup = EXCLUDED.can_pickup,
  can_ship = EXCLUDED.can_ship,
  stock_qty = EXCLUDED.stock_qty,
  images = EXCLUDED.images;

-- =====================
-- 配送・店頭受取両方対応商品 (Both Shipping and Pickup)
-- =====================
INSERT INTO public.products (slug, kind, name, description, price_yen, can_pickup, can_ship, temp_zone, stock_qty, image_url, images, food_label, is_active, sort_order)
VALUES
  ('momo-batch', 'GOODS', '【配送】もも娘缶バッチ', NULL, 350, true, true, 'AMBIENT', 100, '/images/batch.jpg', '[]', NULL, true, 200),
  ('batch-abuu', 'GOODS', '【配送】アブー缶バッチ', NULL, 350, true, true, 'AMBIENT', 100, '/images/batch_abuu.jpg', '[]', NULL, true, 201),
  ('batch-rena', 'GOODS', '【配送】レナ缶バッチ', NULL, 350, true, true, 'AMBIENT', 100, '/images/batch_rena.jpg', '[]', NULL, true, 202),
  ('batch-maco', 'GOODS', '【配送】まこ缶バッチ', NULL, 350, true, true, 'AMBIENT', 100, '/images/batch_maco.jpg', '[]', NULL, true, 203),
  ('taiwan-eraser', 'GOODS', '【配送】台湾消しゴム', NULL, 300, true, true, 'AMBIENT', 100, '/images/eraser.jpg', '[]', NULL, true, 204),
  ('momo-hoodie', 'GOODS', '【配送】もも娘オリジナルパーカー', NULL, 5650, true, true, 'AMBIENT', 30, '/images/hoodie.jpg', '[]', NULL, true, 205),
  ('momo-photo-folder', 'GOODS', '【配送】首掛けストラップ', NULL, 1100, true, true, 'AMBIENT', 50, '/images/photo_folder.jpg', '[]', NULL, true, 206),
  ('momo-tshirt-white', 'GOODS', '【配送】もも娘白Tシャツ', NULL, 2500, true, true, 'AMBIENT', 30, '/images/tshirt_white.jpg', '[]', NULL, true, 207),
  ('momo-uchiwa', 'GOODS', '【配送】うちわ', NULL, 500, true, true, 'AMBIENT', 50, '/images/uchiwa_front.jpg', '["/images/uchiwa_back.jpg"]', NULL, true, 208)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_yen = EXCLUDED.price_yen,
  can_pickup = EXCLUDED.can_pickup,
  can_ship = EXCLUDED.can_ship,
  stock_qty = EXCLUDED.stock_qty,
  images = EXCLUDED.images;
