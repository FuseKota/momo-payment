# momo-payment DB設計書

**対象バージョン**: 本番リリース版（v2.0）
**最終更新**: 2026-06-16
**DBMS**: PostgreSQL 15+（Supabase）
**スキーマソース**: `supabase/migrations/`（00001〜00020）
**型定義**: `src/types/database.ts`

> 本書はマイグレーション（DDL）と整合する正規の DB 設計書です。`gen_random_uuid()`（`pgcrypto`）を主キー既定値に使用します。全テーブルで **RLS（Row Level Security）有効**。注文系の書き込みはアプリの `service_role` 経由で行います。

---

## 1. ENUM 型定義

| 型 | 値 | 用途 |
|----|----|------|
| `order_type` | `SHIPPING` | 注文種別（配送EC専用） |
| `payment_method` | `STRIPE` | 支払い方法（Stripe オンライン決済のみ） |
| `temp_zone` | `AMBIENT` / `FROZEN` | 温度帯 |
| `product_kind` | `FROZEN_FOOD` / `GOODS` | 商品区分 |
| `order_status` | `PENDING_PAYMENT` / `PAID` / `PACKING` / `SHIPPED` / `FULFILLED` / `CANCELED` / `REFUNDED` | 注文ステータス |
| `payment_status` | `INIT` / `LINK_CREATED` / `SUCCEEDED` / `FAILED` / `CANCELED` / `REFUNDED` | 決済ステータス |

> 配送EC（`SHIPPING`）専用・Stripe オンライン決済のみの構成です。店頭受け取り（`PICKUP`）・店頭払い（`PAY_AT_PICKUP`）・Square（`SQUARE`）および `RESERVED` ステータスは撤去済み。

---

## 2. ER 図

```mermaid
erDiagram
    auth_users ||--o| admin_users : "管理者権限"
    auth_users ||--o| customer_profiles : "顧客プロフィール"
    auth_users ||--o{ customer_addresses : "保存住所"
    auth_users ||--o{ orders : "注文者(任意)"

    products ||--o{ product_variants : "バリエーション"
    products ||--o{ order_items : "商品参照"
    product_variants ||--o{ order_items : "バリエーション参照"

    orders ||--o{ order_items : "明細"
    orders ||--o| shipping_addresses : "配送先(1:1)"
    orders ||--o{ shipments : "発送"
    orders ||--o{ payments : "決済"

    admin_users {
        uuid user_id PK_FK
        text role
        timestamptz created_at
    }
    products {
        uuid id PK
        text slug UK
        product_kind kind
        text name
        int price_yen
        temp_zone temp_zone
        int stock_qty
        jsonb food_label
        boolean is_active
    }
    product_variants {
        uuid id PK
        uuid product_id FK
        text size
        int price_yen
        int stock_qty
    }
    orders {
        uuid id PK
        text order_no UK
        order_type order_type
        order_status status
        payment_method payment_method
        temp_zone temp_zone
        int total_yen
        uuid user_id FK
        text locale
        date delivery_date
    }
    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        uuid variant_id FK
        int qty
        int line_total_yen
    }
    shipping_addresses {
        uuid id PK
        uuid order_id FK_UK
    }
    shipments {
        uuid id PK
        uuid order_id FK
        text carrier
        text tracking_no
    }
    payments {
        uuid id PK
        uuid order_id FK
        payment_status status
        text stripe_session_id
    }
    customer_profiles {
        uuid id PK
        uuid user_id FK_UK
    }
    customer_addresses {
        uuid id PK
        uuid user_id FK
    }
```

> `news` / `iitate_calendar_events` / `iitate_calendar_month_notes` / `rate_limit_buckets` / `stripe_webhook_events` / `square_webhook_events` は他テーブルと FK を持たない独立テーブル。

---

## 3. テーブル定義（詳細）

### 3.1 admin_users — 管理者ユーザー

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `user_id` | uuid | PK, FK→`auth.users(id)` ON DELETE CASCADE | Supabase Auth ユーザー |
| `role` | text | NOT NULL, default `'admin'` | 権限ロール |
| `created_at` | timestamptz | NOT NULL, default `now()` | 作成日時 |

- 補助関数 `is_admin()`（SECURITY DEFINER）で管理者判定。

### 3.2 products — 商品マスタ

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `slug` | text | NOT NULL, UNIQUE | URL スラッグ |
| `kind` | product_kind | NOT NULL | 商品区分 |
| `name` | text | NOT NULL | 商品名（日本語） |
| `description` | text | | 説明 |
| `price_yen` | int | NOT NULL, CHECK ≥ 0 | 価格 |
| `can_ship` | boolean | NOT NULL, default false | 配送可否 |
| `temp_zone` | temp_zone | NOT NULL, default `AMBIENT` | 温度帯 |
| `stock_qty` | int | CHECK null or ≥ 0 | 在庫（null=管理しない） |
| `image_url` | text | | 代表画像 |
| `images` | jsonb | default `[]` | 追加画像（`00004`） |
| `food_label` | jsonb | | 食品表示（原材料/アレルゲン/栄養/内容量/期限） |
| `has_variants` | boolean | NOT NULL, default false | バリエーション有無（`00005`） |
| `name_zh_tw` | text | | 商品名（繁体字、`00010`） |
| `description_zh_tw` | text | | 説明（繁体字、`00010`） |
| `food_label_zh_tw` | jsonb | | 食品表示（繁体字、`00010`） |
| `is_active` | boolean | NOT NULL, default true | 公開フラグ |
| `sort_order` | int | NOT NULL, default 0 | 表示順 |
| `created_at` / `updated_at` | timestamptz | NOT NULL, default `now()` | （`updated_at` はトリガ更新） |

- インデックス: `(is_active, sort_order)` / `kind` / `slug`

### 3.3 product_variants — 商品バリエーション（`00005`）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `product_id` | uuid | NOT NULL, FK→`products(id)` ON DELETE CASCADE | |
| `size` | text | | サイズ名 |
| `price_yen` | int | CHECK null or ≥ 0 | バリエーション価格 |
| `stock_qty` | int | CHECK null or ≥ 0 | バリエーション在庫 |
| `is_active` | boolean | NOT NULL, default true | |
| `sort_order` | int | NOT NULL, default 0 | |
| `created_at` / `updated_at` | timestamptz | NOT NULL, default `now()` | |

- 制約: `UNIQUE(product_id, size)` / インデックス: `product_id`, `(product_id, is_active)`

### 3.4 orders — 注文

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `order_no` | text | NOT NULL, UNIQUE, default `generate_order_no()` | 注文番号（`YYYYMMDD-XXXXXXXX`） |
| `order_type` | order_type | NOT NULL | SHIPPING |
| `status` | order_status | NOT NULL | ステータス |
| `payment_method` | payment_method | NOT NULL | 支払い方法 |
| `temp_zone` | temp_zone | （SHIPPING は必須） | 温度帯 |
| `subtotal_yen` | int | NOT NULL, CHECK ≥ 0 | 小計 |
| `shipping_fee_yen` | int | NOT NULL, default 0, CHECK ≥ 0 | 送料 |
| `total_yen` | int | NOT NULL, CHECK ≥ 0 | 合計 |
| `customer_name` | text | NOT NULL | 顧客氏名 |
| `customer_phone` | text | NOT NULL | 顧客電話 |
| `customer_email` | text | | 顧客メール |
| `delivery_date` | date | | 配送日（`00017`） |
| `delivery_time_slot` | text | CHECK（後述） | 配送時間帯（`00017`） |
| `paid_at` | timestamptz | | 入金日時（`00003`） |
| `user_id` | uuid | FK→`auth.users(id)` | 注文者（任意、`00008`） |
| `locale` | varchar(10) | NOT NULL, default `'ja'` | ロケール（`00009`） |
| `agreement_accepted` | boolean | NOT NULL, default false | 規約同意 |
| `admin_note` | text | | 管理メモ |
| `created_at` / `updated_at` | timestamptz | NOT NULL, default `now()` | |

**制約（CHECK）**

| 制約名 | 内容 |
|--------|------|
| `orders_total_consistency` | `total_yen = subtotal_yen + shipping_fee_yen` |
| `orders_shipping_rules` | `SHIPPING` は `payment_method = 'STRIPE'` かつ `temp_zone` 必須 |
| `orders_delivery_time_slot_check` | `delivery_time_slot` は null または `UNSPECIFIED/AM/T12_14/T14_16/T16_18/T18_21` |

- インデックス: `created_at desc` / `status` / `order_type` / `order_no` / `user_id`

### 3.5 order_items — 注文明細（スナップショット保持）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `order_id` | uuid | NOT NULL, FK→`orders(id)` ON DELETE CASCADE | |
| `product_id` | uuid | NOT NULL, FK→`products(id)` | |
| `variant_id` | uuid | FK→`product_variants(id)` | バリエーション（`00005`） |
| `product_size` | text | | サイズスナップショット（`00005`） |
| `qty` | int | NOT NULL, CHECK > 0 | 数量 |
| `unit_price_yen` | int | NOT NULL, CHECK ≥ 0 | 単価 |
| `line_total_yen` | int | NOT NULL, CHECK ≥ 0 | 明細合計 |
| `product_name` | text | NOT NULL | 商品名スナップショット |
| `product_kind` | product_kind | NOT NULL | 区分スナップショット |
| `product_temp_zone` | temp_zone | NOT NULL | 温度帯スナップショット |
| `created_at` | timestamptz | NOT NULL, default `now()` | |

- 制約: `order_items_line_total`（`line_total_yen = unit_price_yen * qty`） / インデックス: `order_id`, `variant_id`

### 3.6 shipping_addresses — 配送先住所（注文と 1:1）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `order_id` | uuid | NOT NULL, **UNIQUE**, FK→`orders(id)` ON DELETE CASCADE | 1注文1住所 |
| `postal_code` | text | NOT NULL | 郵便番号 |
| `pref` | text | NOT NULL | 都道府県 |
| `city` | text | NOT NULL | 市区町村 |
| `address1` | text | NOT NULL | 住所1 |
| `address2` | text | | 住所2 |
| `recipient_name` | text | NOT NULL | 受取人氏名 |
| `recipient_phone` | text | NOT NULL | 受取人電話 |
| `created_at` | timestamptz | NOT NULL, default `now()` | |

### 3.7 shipments — 発送情報

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `order_id` | uuid | NOT NULL, FK→`orders(id)` ON DELETE CASCADE | |
| `carrier` | text | | 配送業者（yamato/sagawa/jp_post/other） |
| `tracking_no` | text | | 追跡番号 |
| `shipped_at` | timestamptz | | 発送日時 |
| `created_at` | timestamptz | NOT NULL, default `now()` | |

### 3.8 payments — 決済情報

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `order_id` | uuid | NOT NULL, FK→`orders(id)` ON DELETE CASCADE | |
| `provider` | text | NOT NULL | `stripe` / `on_site` 等 |
| `status` | payment_status | NOT NULL, default `INIT` | 決済ステータス |
| `amount_yen` | int | NOT NULL, CHECK ≥ 0 | 金額 |
| `stripe_session_id` | text | | Stripe Checkout Session（`00006`） |
| `stripe_payment_intent_id` | text | | Stripe PaymentIntent（`00006`） |
| `stripe_environment` | text | | test / live（`00006`） |
| `square_payment_link_id` 他 | text | | 旧 Square 用カラム（未使用） |
| `idempotency_key` | text | | 冪等キー |
| `raw_webhook` | jsonb | | Webhook 生データ |
| `created_at` / `updated_at` | timestamptz | NOT NULL, default `now()` | |

- インデックス: `order_id` / `stripe_session_id` / （旧）`square_order_id`, `square_payment_id`

### 3.9 stripe_webhook_events — Stripe Webhook 冪等管理（`00006`）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `event_id` | text | PK | Stripe イベント ID（冪等キー） |
| `event_type` | text | NOT NULL | イベント種別 |
| `received_at` | timestamptz | NOT NULL, default `now()` | 受信日時 |
| `payload` | jsonb | NOT NULL | 生ペイロード |

### 3.10 customer_profiles — 顧客プロフィール（`00008`）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `user_id` | uuid | NOT NULL, **UNIQUE**, FK→`auth.users(id)` ON DELETE CASCADE | |
| `display_name` | text | | 表示名 |
| `phone` | text | | 電話番号 |
| `created_at` / `updated_at` | timestamptz | default `now()` | |

### 3.11 customer_addresses — 顧客の保存住所（`00008`）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `user_id` | uuid | NOT NULL, FK→`auth.users(id)` ON DELETE CASCADE | |
| `label` | text | default `'自宅'` | 住所ラベル |
| `postal_code` / `pref` / `city` / `address1` | text | NOT NULL | 住所 |
| `address2` | text | | 住所2 |
| `recipient_name` / `recipient_phone` | text | NOT NULL | 受取人 |
| `is_default` | boolean | default false | 既定住所 |
| `created_at` | timestamptz | default `now()` | |

### 3.12 news — お知らせ（`00012`）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `title` | text | NOT NULL | タイトル |
| `content` | text | | 本文 |
| `excerpt` | text | | 抜粋 |
| `category` | text | NOT NULL, default `'福島もも娘'` | カテゴリ |
| `slug` | text | NOT NULL, UNIQUE | URL スラッグ |
| `is_published` | boolean | NOT NULL, default false | 公開フラグ |
| `published_at` | timestamptz | | 公開日時 |
| `created_at` / `updated_at` | timestamptz | NOT NULL, default `now()` | |

### 3.13 iitate_calendar_events — 台湾夜市カレンダー（`00014`）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `event_date` | date | NOT NULL, UNIQUE | 開催日 |
| `types` | text[] | NOT NULL, default `{}`, CHECK ⊆ `{day,night,closed,stage}` | 種別（昼/夜/休/ステージ） |
| `created_at` / `updated_at` | timestamptz | NOT NULL, default `now()` | |

### 3.14 iitate_calendar_month_notes — 月メモ（`00014`）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `id` | uuid | PK | |
| `year_month` | text | NOT NULL, UNIQUE, CHECK `^\d{4}-\d{2}$` | 対象年月 |
| `notes` | text[] | NOT NULL, default `{}` | 注記 |
| `created_at` / `updated_at` | timestamptz | NOT NULL, default `now()` | |

### 3.15 rate_limit_buckets — レート制限バケット（`00016`）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| `identifier` | text | PK | 識別子（IP 等） |
| `count` | int | NOT NULL, default 0 | カウント |
| `reset_at` | timestamptz | NOT NULL | リセット時刻 |
| `created_at` | timestamptz | NOT NULL, default `now()` | |

> アプリの主たるレート制限はインメモリ実装。本テーブルは DB バックアップ用途。

### 3.16 square_webhook_events —（旧仕様・未使用、`00001`）

旧 Square 決済のために作成された冪等管理テーブル。現行の Stripe フローでは使用しません（`stripe_webhook_events` を使用）。

---

## 4. 関数・トリガ・RPC

| 種別 | 名前 | 説明 |
|-----|------|------|
| 関数 | `set_updated_at()` | `updated_at` 自動更新トリガ関数 |
| 関数 | `generate_order_no()` | 注文番号生成（`YYYYMMDD-` + ランダム8桁） |
| 関数 | `is_admin()` | 管理者判定（SECURITY DEFINER） |
| RPC | `decrement_variant_stock(...)` | バリエーション在庫の減算（`00018`） |
| RPC | `reorder_products(p_items jsonb)` | 商品表示順の一括更新（`00019`） |
| トリガ | `trg_*_updated_at` | products/orders/payments/variants 等で `updated_at` 更新 |

---

## 5. RLS（Row Level Security）方針

全テーブルで RLS 有効。主なポリシー:

| テーブル | 方針 |
|---------|------|
| `products` | 公開（`is_active=true`）は anon/authenticated が SELECT 可。管理者は全操作可 |
| `orders` / `order_items` / `shipping_addresses` / `shipments` / `payments` | 管理者のみ。顧客向け書込みはアプリの `service_role` 経由 |
| `customer_profiles` / `customer_addresses` | 本人（`auth.uid() = user_id`）のみ参照・操作可 |
| `news` | 公開はパブリック SELECT、編集は管理者 |
| `iitate_calendar_*` | 公開 SELECT、編集は管理者 |
| `admin_users` | 管理者のみ参照 |

> セキュリティ強化は `00011` / `00013` / `00015` / `00020`（Security Advisors 対応）で段階的に実施。

---

## 6. マイグレーション履歴

| 連番 | 内容 |
|-----|------|
| 00001 | 初期スキーマ（ENUM・主要テーブル・RLS・関数） |
| 00002 | ストレージバケット `product-images` |
| 00003 | `orders.paid_at` 追加 |
| 00004 | `products.images`（jsonb）追加 |
| 00005 | `product_variants` 追加、`order_items` にバリエーション列 |
| 00006 | **Stripe 対応**（payments に Stripe 列、`STRIPE` enum 値、`stripe_webhook_events`） |
| 00007 | `orders_shipping_rules` を STRIPE 許可に更新 |
| 00008 | 顧客アカウント（`customer_profiles` / `customer_addresses`、`orders.user_id`） |
| 00009 | `orders.locale` 追加 |
| 00010 | 商品 i18n（`name_zh_tw` 等） |
| 00011 | RLS ポリシー修正 |
| 00012 | `news` テーブル |
| 00013 | セキュリティ修正 |
| 00014 | 台湾夜市カレンダー（events / month_notes） |
| 00015 | セキュリティ強化 |
| 00016 | `rate_limit_buckets` |
| 00017 | 配送日時（`delivery_date` / `delivery_time_slot`） |
| 00018 | 在庫減算 RPC |
| 00019 | 商品並び替え RPC |
| 00020 | Security Advisors 対応強化 |

---

## 7. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/REQUIREMENTS.md` | 要件定義書 |
| `docs/SYSTEM_ARCHITECTURE.md` | システム構成図（ER 概要含む） |
| `docs/TECHNICAL.md` | 技術ドキュメント |
| `src/types/database.ts` | TypeScript 型定義 |
| `supabase/migrations/` | マイグレーション SQL（正規ソース） |
