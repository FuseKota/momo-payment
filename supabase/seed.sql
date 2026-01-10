-- Seed data for momo-payment
-- Run this after migration: supabase db push

-- =====================
-- 配送専用商品 (Shipping Only)
-- =====================
INSERT INTO public.products (slug, kind, name, description, price_yen, can_pickup, can_ship, temp_zone, stock_qty, image_url, images, food_label, is_active, sort_order)
VALUES
  ('rurohan-frozen', 'FROZEN_FOOD', '【配送】冷凍魯肉飯（2食入）', '本格台湾魯肉飯を冷凍でお届け。八角香る豚バラ肉の煮込みをご家庭で簡単に楽しめます。電子レンジで温めるだけでお店の味が再現できます。', 1200, false, true, 'FROZEN', 50, '/images/rurohan.jpg',
    '["/images/rurohan-detail.jpg"]',
    '{"ingredients": "豚バラ肉、醤油、砂糖、米酒、八角、五香粉、にんにく、エシャロット", "allergens": "小麦、大豆、豚肉", "nutrition": {"calories": 450, "protein": 18, "fat": 28, "carbohydrates": 32, "sodium": 890}, "net_weight_grams": 300, "expiry_info": "製造日より6ヶ月（冷凍保存）", "storage_method": "-18℃以下で保存してください", "manufacturer": "もも娘"}',
    true, 1),
  ('rurohan-frozen-set', 'FROZEN_FOOD', '【配送】冷凍魯肉飯セット（4食入）', 'お得な4食入りセット。ご家族やお友達とシェアして楽しめます。まとめ買いでさらにお得！', 2200, false, true, 'FROZEN', 30, '/images/rurohan-set.jpg',
    '["/images/rurohan-detail.jpg"]',
    '{"ingredients": "豚バラ肉、醤油、砂糖、米酒、八角、五香粉、にんにく、エシャロット", "allergens": "小麦、大豆、豚肉", "nutrition": {"calories": 450, "protein": 18, "fat": 28, "carbohydrates": 32, "sodium": 890}, "net_weight_grams": 600, "expiry_info": "製造日より6ヶ月（冷凍保存）", "storage_method": "-18℃以下で保存してください", "manufacturer": "もも娘"}',
    true, 2),
  ('momo-tshirt-ship', 'GOODS', '福島もも娘黒Tシャツ', 'もも娘ロゴ入りのオリジナルTシャツ。やわらかい肌触りの綿100%素材。サイズはMとLをご用意。', 3500, false, true, 'AMBIENT', 20, '/images/tshirt.jpg', '[]', NULL, true, 10),
  ('momo-towel', 'GOODS', '【配送】もも娘フェイスタオル', 'ふわふわ肌触りの今治タオル。もも娘の刺繍入り。毎日使えるかわいいタオルです。', 1800, false, true, 'AMBIENT', 40, '/images/towel.jpg', '[]', NULL, true, 11),
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
  ('karaage-5pc', 'GOODS', '唐揚げ5個', 'サクサクジューシーな台湾風唐揚げ。スパイシーな味付けがクセになる人気メニュー。', 500, true, false, 'AMBIENT', NULL, '/images/pickup/karaage.jpg', '[]', NULL, true, 101),
  ('tapioca-milk-tea', 'GOODS', 'タピオカミルクティー', 'もちもちタピオカ入りの本格台湾ミルクティー。甘さ控えめで飲みやすい。', 500, true, false, 'AMBIENT', NULL, '/images/pickup/tapioca.jpg', '[]', NULL, true, 102),
  ('rurohan-single', 'GOODS', 'ルーローハン 単品', '八角香る豚バラ煮込みをご飯にのせた台湾の定番丼。とろとろの豚肉が絶品。', 800, true, false, 'AMBIENT', NULL, '/images/pickup/rurohan.jpg', '[]', NULL, true, 103),
  ('rurohan-set', 'GOODS', 'ルーローハン＋ウーロン茶セット', 'ルーローハンとさっぱりウーロン茶のお得なセット。', 1000, true, false, 'AMBIENT', NULL, '/images/pickup/rurohan-set.jpg', '[]', NULL, true, 104),
  ('jirohan-single', 'GOODS', 'ヂーローハン 単品', '台湾風蒸し鶏をご飯にのせたヘルシー丼。特製タレが決め手。', 800, true, false, 'AMBIENT', NULL, '/images/pickup/jirohan.jpg', '[]', NULL, true, 105),
  ('jirohan-set', 'GOODS', 'ヂーローハン＋ウーロン茶セット', 'ヂーローハンとさっぱりウーロン茶のお得なセット。', 1000, true, false, 'AMBIENT', NULL, '/images/pickup/jirohan-set.jpg', '[]', NULL, true, 106),
  ('taiwan-beer', 'GOODS', '台湾ビール', '台湾を代表するラガービール。すっきりとした味わい。', 450, true, false, 'AMBIENT', NULL, '/images/pickup/taiwan-beer.jpg', '[]', NULL, true, 107),
  ('pineapple-cake', 'GOODS', '台湾パイナップルケーキ', '台湾土産の定番。サクサク生地と甘酸っぱいパイナップル餡。', 150, true, false, 'AMBIENT', NULL, '/images/pickup/pineapple-cake.jpg', '[]', NULL, true, 108),
  -- グッズ
  ('tshirt-light', 'GOODS', 'Tシャツ 薄手', 'もも娘オリジナルTシャツ（薄手）。夏にぴったりの軽やかな着心地。', 2000, true, false, 'AMBIENT', 30, '/images/pickup/tshirt-light.jpg', '[]', NULL, true, 109),
  ('tshirt-heavy', 'GOODS', 'Tシャツ 厚手', 'もも娘オリジナルTシャツ（厚手）。しっかりした生地で長く使える。', 2500, true, false, 'AMBIENT', 20, '/images/pickup/tshirt-heavy.jpg', '[]', NULL, true, 110),
  ('keychain', 'GOODS', 'キーホルダー', 'もも娘オリジナルキーホルダー。かわいいデザインで毎日持ち歩きたくなる。', 800, true, false, 'AMBIENT', 50, '/images/pickup/keychain.jpg', '[]', NULL, true, 111)
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
  ('momo-batch', 'GOODS', '福島もも娘缶バッチ', '福島もも娘オリジナルデザインの缶バッチ。', 500, true, true, 'AMBIENT', 100, '/images/batch.jpg', '[]', NULL, true, 200),
  ('batch-abuu', 'GOODS', 'アブー缶バッチ', 'アブーデザインの缶バッチ。', 500, true, true, 'AMBIENT', 100, '/images/batch_abuu.jpg', '[]', NULL, true, 201),
  ('batch-rena', 'GOODS', 'レナ缶バッチ', 'レナデザインの缶バッチ。', 500, true, true, 'AMBIENT', 100, '/images/batch_rena.jpg', '[]', NULL, true, 202),
  ('batch-maco', 'GOODS', 'まこ缶バッチ', 'まこデザインの缶バッチ。', 500, true, true, 'AMBIENT', 100, '/images/batch_maco.jpg', '[]', NULL, true, 203),
  ('taiwan-eraser', 'GOODS', '台湾消しゴム', '台湾デザインの消しゴム。', 300, true, true, 'AMBIENT', 100, '/images/eraser.jpg', '[]', NULL, true, 204),
  ('momo-hoodie', 'GOODS', '福島もも娘パーカー', '福島もも娘オリジナルデザインのパーカー。', 5000, true, true, 'AMBIENT', 30, '/images/hoodie.jpg', '[]', NULL, true, 205),
  ('momo-photo-folder', 'GOODS', '福島もも娘フォトフォルダー', '福島もも娘オリジナルデザインのフォトフォルダー。', 800, true, true, 'AMBIENT', 50, '/images/photo_folder.jpg', '[]', NULL, true, 206),
  ('momo-tshirt-white', 'GOODS', '福島もも娘白Tシャツ', '福島もも娘オリジナルデザインの白Tシャツ。', 3500, true, true, 'AMBIENT', 30, '/images/tshirt_white.jpg', '[]', NULL, true, 207),
  ('momo-uchiwa', 'GOODS', '福島もも娘うちわ', '福島もも娘オリジナルデザインのうちわ。', 800, true, true, 'AMBIENT', 50, '/images/uchiwa_front.jpg', '["/images/uchiwa_back.jpg"]', NULL, true, 208)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_yen = EXCLUDED.price_yen,
  can_pickup = EXCLUDED.can_pickup,
  can_ship = EXCLUDED.can_ship,
  stock_qty = EXCLUDED.stock_qty,
  images = EXCLUDED.images;
