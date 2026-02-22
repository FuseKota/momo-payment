-- customer_profiles: 顧客プロフィール
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- customer_addresses: 顧客配送先住所
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT DEFAULT '自宅',
  postal_code TEXT NOT NULL,
  pref TEXT NOT NULL,
  city TEXT NOT NULL,
  address1 TEXT NOT NULL,
  address2 TEXT,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- orders に user_id カラム追加
ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- RLS 有効化
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- customer_profiles RLS ポリシー
CREATE POLICY "customer_profiles_select_own" ON customer_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "customer_profiles_insert_own" ON customer_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customer_profiles_update_own" ON customer_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 管理者は全プロフィール参照可能
CREATE POLICY "customer_profiles_admin_select" ON customer_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- customer_addresses RLS ポリシー
CREATE POLICY "customer_addresses_select_own" ON customer_addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "customer_addresses_insert_own" ON customer_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customer_addresses_update_own" ON customer_addresses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "customer_addresses_delete_own" ON customer_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- orders: 本人の注文を参照可能にするポリシー追加
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (auth.uid() = user_id);
