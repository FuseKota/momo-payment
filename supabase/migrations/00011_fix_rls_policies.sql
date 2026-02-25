-- =============================================
-- RLSポリシー補完・整合性修正
-- 多層防御（defense in depth）として抜け漏れを修正
-- =============================================

-- 1. product_variants: 管理者は全操作OK（productsテーブルと同パターン）
DROP POLICY IF EXISTS "product_variants_admin_all" ON public.product_variants;
CREATE POLICY "product_variants_admin_all"
ON public.product_variants FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 2. customer_addresses: 管理者は閲覧可能（customer_profilesと同パターン）
DROP POLICY IF EXISTS "customer_addresses_admin_select" ON public.customer_addresses;
CREATE POLICY "customer_addresses_admin_select"
ON public.customer_addresses FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- 3. order_items: 顧客は自分の注文に紐づくレコードを閲覧可能
DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
CREATE POLICY "order_items_select_own"
ON public.order_items FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid()
));

-- 4. shipping_addresses: 顧客は自分の注文に紐づくレコードを閲覧可能
DROP POLICY IF EXISTS "shipping_addresses_select_own" ON public.shipping_addresses;
CREATE POLICY "shipping_addresses_select_own"
ON public.shipping_addresses FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders WHERE id = shipping_addresses.order_id AND user_id = auth.uid()
));

-- 5. shipments: 顧客は自分の注文に紐づくレコードを閲覧可能
DROP POLICY IF EXISTS "shipments_select_own" ON public.shipments;
CREATE POLICY "shipments_select_own"
ON public.shipments FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders WHERE id = shipments.order_id AND user_id = auth.uid()
));

-- 6. payments: 顧客は自分の注文に紐づくレコードを閲覧可能
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own"
ON public.payments FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders WHERE id = payments.order_id AND user_id = auth.uid()
));
