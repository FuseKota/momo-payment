# momo-payment 技術ドキュメント

> **最終更新**: 2026-03-19
> **対象バージョン**: 現在の実装状態（Stripe移行済み）

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [技術スタック](#2-技術スタック)
3. [ディレクトリ構成](#3-ディレクトリ構成)
4. [環境変数](#4-環境変数)
5. [開発コマンド](#5-開発コマンド)
6. [アーキテクチャ](#6-アーキテクチャ)
7. [データベーススキーマ](#7-データベーススキーマ)
8. [API リファレンス](#8-api-リファレンス)
9. [認証・セキュリティ](#9-認証セキュリティ)
10. [国際化（i18n）](#10-国際化i18n)
11. [決済フロー（Stripe）](#11-決済フローstripe)
12. [メール通知](#12-メール通知)
13. [テスト](#13-テスト)
14. [デプロイ・インフラ](#14-デプロイインフラ)

---

## 1. プロジェクト概要

「もも娘」のオンライン注文システム。2つの購入体験を提供する。

| 購入体験 | 説明 | 決済 |
|---------|------|------|
| **店頭受け取り（PICKUP）** | イベント・店頭での事前注文 | Stripe事前決済 または 店頭払い |
| **配送EC（SHIPPING）** | 冷凍食品・グッズのオンライン配送 | Stripe（必須） |

### 重要な制約

- **温度帯混在禁止**: 冷凍食品（FROZEN）とグッズ（AMBIENT）の同時購入は不可。別注文にする。
- **配送はStripe必須**: SHIPPING注文はStripe決済のみ受け付ける。
- **送料**: 一律 ¥1,200（環境変数 `SHIPPING_FEE_YEN` で変更可能）

---

## 2. 技術スタック

| カテゴリ | ライブラリ | バージョン |
|---------|-----------|-----------|
| フレームワーク | Next.js | 16.1.1 (App Router) |
| 言語 | TypeScript | 5.x |
| UIコンポーネント | MUI (Material UI) | 7.3.6 |
| スタイリング | Tailwind CSS | 4.x |
| データベース | Supabase (PostgreSQL) | @supabase/supabase-js 2.89.0 |
| 認証 | Supabase Auth | @supabase/ssr 0.8.0 |
| 決済 | Stripe | 20.1.2 |
| メール | Resend | 6.6.0 |
| 国際化 | next-intl | 4.8.3 |
| バリデーション | Zod | 4.3.5 |
| テスト | Vitest | 4.0.17 |
| Stripe API バージョン | | 2025-12-15.clover |

---

## 3. ディレクトリ構成

```
momo-payment/
├── src/
│   ├── app/
│   │   ├── [locale]/                   # ロケールプレフィックス付きページ
│   │   │   ├── layout.tsx              # ルートレイアウト（フォント切替、OGP）
│   │   │   ├── page.tsx                # トップページ（Hero + ニュース）
│   │   │   ├── pickup/                 # 店頭受け取り注文フォーム
│   │   │   ├── shop/                   # 配送EC商品一覧
│   │   │   │   └── [slug]/             # 商品詳細
│   │   │   ├── cart/                   # カート（温度帯混在チェック）
│   │   │   ├── checkout/
│   │   │   │   ├── pickup/             # 店頭受け取り決済選択
│   │   │   │   └── shipping/           # 配送チェックアウト（住所入力）
│   │   │   ├── complete/               # 注文完了
│   │   │   ├── login/                  # ユーザーログイン
│   │   │   ├── mypage/                 # マイページ
│   │   │   │   ├── page.tsx            # 注文履歴
│   │   │   │   ├── addresses/          # 配送先住所管理
│   │   │   │   └── orders/[id]/        # 注文詳細
│   │   │   ├── news/                   # ニュース一覧
│   │   │   │   └── [slug]/             # ニュース詳細
│   │   │   ├── taiwan-night-market/    # 台湾夜市特設ページ
│   │   │   └── legal/
│   │   │       ├── tokushoho/          # 特定商取引法表記
│   │   │       └── privacy/            # プライバシーポリシー
│   │   ├── admin/                      # 管理画面（ロケール不要）
│   │   │   ├── login/                  # 管理者ログイン
│   │   │   ├── products/               # 商品管理（CRUD）
│   │   │   ├── news/                   # ニュース管理
│   │   │   └── orders/
│   │   │       ├── page.tsx            # 注文一覧
│   │   │       └── [id]/               # 注文詳細・管理
│   │   └── api/
│   │       ├── products/               # GET: 商品一覧
│   │       ├── news/                   # GET: ニュース一覧（公開）
│   │       ├── auth/signup/            # POST: ユーザー登録
│   │       ├── postal-code/lookup/     # GET: 郵便番号検索
│   │       ├── orders/
│   │       │   ├── pickup/             # POST: 店頭受け取り注文作成
│   │       │   ├── shipping/           # POST: 配送注文作成
│   │       │   └── by-no/[orderNo]/    # GET: 注文番号検索
│   │       ├── mypage/
│   │       │   ├── orders/             # GET: ユーザー注文一覧
│   │       │   │   └── [id]/           # GET: 注文詳細
│   │       │   └── addresses/          # CRUD: 配送先住所管理
│   │       ├── webhooks/stripe/        # POST: Stripe Webhook
│   │       └── admin/
│   │           ├── products/           # CRUD: 商品管理
│   │           ├── news/               # CRUD: ニュース管理
│   │           ├── upload/             # POST: 画像アップロード
│   │           └── orders/
│   │               ├── route.ts        # GET: 注文一覧
│   │               └── [id]/
│   │                   ├── route.ts    # GET: 注文詳細
│   │                   ├── mark-paid/  # POST: 入金確認
│   │                   └── ship/       # POST: 発送登録
│   ├── contexts/
│   │   ├── CartContext.tsx             # カート状態管理（localStorage永続化）
│   │   └── AuthContext.tsx             # ユーザー認証状態管理
│   ├── hooks/
│   │   └── usePostalCodeLookup.ts      # 郵便番号→住所検索フック
│   ├── types/
│   │   └── database.ts                 # 全DBモデルの型定義
│   ├── middleware.ts                   # セキュリティヘッダー・i18n・セッションリフレッシュ
│   ├── i18n/routing.ts                 # next-intl ルーティング設定
│   └── lib/
│       ├── env.ts                      # 環境変数Zod検証
│       ├── auth/
│       │   ├── require-admin.ts        # 管理者認証要求
│       │   └── require-customer.ts     # 顧客認証要求
│       ├── supabase/
│       │   ├── admin.ts                # Service Roleクライアント（RLSバイパス）
│       │   ├── server.ts               # SSRクライアント（Cookieベース）
│       │   └── client.ts               # ブラウザクライアント（Anonキー）
│       ├── stripe/
│       │   ├── client.ts               # Stripe SDK初期化
│       │   └── webhook.ts              # Webhook署名検証・イベント判定
│       ├── email/
│       │   └── resend.ts               # メール送信（注文確認・発送通知・決済完了）
│       ├── security/
│       │   ├── rate-limit.ts           # インメモリレート制限（スライディングウィンドウ）
│       │   └── csrf.ts                 # CSRF保護（Origin/Referer検証）
│       ├── validation/
│       │   └── schemas.ts              # Zodバリデーションスキーマ
│       ├── logging/
│       │   └── secure-logger.ts        # PIIマスク付きログ
│       ├── storage/
│       │   └── upload.ts               # 画像アップロード（Supabase Storage）
│       ├── utils/
│       │   ├── constants.ts            # 定数
│       │   ├── format.ts               # 日付・金額フォーマット
│       │   ├── form-validators.ts      # フォームバリデーション
│       │   └── localize-product.ts     # 商品データのi18nローカライズ
│       ├── api/
│       │   ├── admin-guards.ts         # 管理者API認証ガード
│       │   ├── order-guards.ts         # 注文アクセス制御
│       │   ├── price-calc.ts           # 価格計算ロジック
│       │   ├── product-helpers.ts      # 商品取得・バリデーションヘルパー
│       │   └── localize.ts             # APIレスポンスのi18nローカライズ
│       └── mui/
│           ├── theme.ts                # MUIテーマ（ピンク・ゴールド配色）
│           └── ThemeRegistry.tsx       # App Router + MUI統合
├── messages/
│   ├── ja.json                         # 日本語翻訳メッセージ
│   └── zh-tw.json                      # 繁体字中文翻訳メッセージ
├── supabase/
│   └── migrations/                     # DBマイグレーション（12ファイル）
├── docs/
│   ├── REQUIREMENTS.md                 # 要件定義書（初期版・一部古い）
│   └── TECHNICAL.md                    # 技術ドキュメント（本ファイル）
├── scripts/
│   ├── seed.ts                         # DBシードデータ
│   └── create-admin.ts                 # 管理者アカウント作成
├── next.config.ts                      # Next.js設定（セキュリティヘッダー・i18n）
├── package.json
└── vitest.config.ts
```

---

## 4. 環境変数

`.env.example` を `.env.local` にコピーして設定する。起動時に `src/lib/env.ts` でZod検証が実行される。

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe（バリデーション: sk_ で始まること / whsec_ で始まること）
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email（オプション）
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@example.com
ADMIN_EMAIL=admin@example.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
SHIPPING_FEE_YEN=1200              # 送料（正の整数、デフォルト: 1200）
```

### 環境変数バリデーション（src/lib/env.ts）

アプリ起動時にZodで検証し、不正な値があれば起動を中断する。

| 変数 | 検証ルール |
|-----|---------|
| `STRIPE_SECRET_KEY` | `sk_` で始まること |
| `STRIPE_WEBHOOK_SECRET` | `whsec_` で始まること |
| `NEXT_PUBLIC_SUPABASE_URL` | 有効なURL形式 |
| `SUPABASE_SERVICE_ROLE_KEY` | 必須 |
| `SHIPPING_FEE_YEN` | 正の整数（デフォルト: 1200） |
| `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL` | オプション |

---

## 5. 開発コマンド

```bash
# 開発
npm run dev              # 開発サーバー起動 (http://localhost:3000)
npm run build            # 本番ビルド
npm run start            # 本番サーバー起動
npm run lint             # ESLint実行

# DB
npm run seed             # シードデータ投入
npm run create-admin     # 管理者アカウント作成

# テスト
npx vitest run                          # 全テスト実行
npx vitest run src/path/to/test.ts      # 単一ファイル実行
npx vitest                              # ウォッチモード
npx vitest run --coverage               # カバレッジ

# Stripe ローカルテスト
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Stripe テストカード

| カード番号 | 動作 |
|----------|------|
| `4242 4242 4242 4242` | 成功 |
| `4000 0000 0000 9995` | 拒否（残高不足） |
| `4000 0027 6000 3184` | 3DS認証必須 |

---

## 6. アーキテクチャ

### リクエスト処理フロー

```
ブラウザ
  │
  ▼
src/middleware.ts
  ├── /admin/* /api/*  → セキュリティヘッダー付与（i18nスキップ）
  │       ├── /admin/* → Supabaseセッションリフレッシュ
  │       └── /api/orders/* → レート制限ヘッダー追加
  └── /[locale]/* → next-intl ミドルウェア（ロケール検出）
           └── /[locale]/mypage, /login, /checkout/shipping
                   → Supabaseセッションリフレッシュ
```

### Supabase クライアント使い分け

| クライアント | ファイル | 用途 | キー |
|------------|--------|------|-----|
| Admin | `src/lib/supabase/admin.ts` | API Routes（RLS無視） | Service Role |
| Server | `src/lib/supabase/server.ts` | SSR / Server Components（セッション考慮） | Anon |
| Client | `src/lib/supabase/client.ts` | ブラウザコンポーネント | Anon |

### 認証ガード

```typescript
// 管理者専用 API
const { supabase, user } = await requireAdmin();

// 顧客専用 API（未ログインはエラー）
const { supabase, user } = await requireCustomer();

// 注文 API（未ログインでも可、user_id は null になる）
const { userId } = await orderGuard(request);  // レート制限 + CSRF も実行
```

### MUI テーマ（src/lib/mui/theme.ts）

```
Primary: ピンク #FF6680（桃のイメージ）
  - Light: #FFA3B3  Dark: #D13355
Secondary: ゴールド #FFC107（アクセント）
  - Light: #FFD54F  Dark: #FFA000
Background: #FFFBFC（ライトピンク）
Font: Noto Sans JP（ja）/ Noto Sans TC（zh-tw）
```

---

## 7. データベーススキーマ

### マイグレーション一覧

| ファイル | 内容 |
|--------|------|
| `00001_initial_schema.sql` | テーブル・ENUM・トリガー等の基本構造 |
| `00002_storage_bucket.sql` | Supabase Storageバケット設定 |
| `00003_add_paid_at.sql` | `payments.paid_at` カラム追加 |
| `00004_add_product_images.sql` | `products.images` 配列カラム追加 |
| `00005_add_product_variants.sql` | `product_variants` テーブル作成 |
| `00006_add_stripe_support.sql` | Stripe対応（`stripe_session_id`等） |
| `00007_update_orders_constraint.sql` | Stripe対応での制約更新 |
| `00008_add_customer_accounts.sql` | `customer_profiles` / `customer_addresses` テーブル |
| `00009_add_order_locale.sql` | `orders.locale` カラム追加 |
| `00010_add_product_i18n.sql` | `products` に繁体字中文翻訳カラム追加 |
| `00011_fix_rls_policies.sql` | RLS（Row Level Security）ポリシー調整 |
| `00012_create_news_table.sql` | `news` テーブル作成 |

### ER図

```
admin_users（Supabase Auth連携）
    │
products ──┬── product_variants
           │
           │         ┌── order_items ───┐
           └──────────►                  │
                                         ▼
                               orders ──┬── payments
                                        ├── shipping_addresses
                                        ├── shipments
                                        └── stripe_webhook_events

customer_profiles ── customer_addresses（マイページ住所帳）

news（独立テーブル）
```

### 主要テーブル

#### products

| カラム | 型 | 説明 |
|-------|-----|------|
| `id` | UUID | PK |
| `slug` | text | URL用識別子（一意） |
| `kind` | enum | `FROZEN_FOOD` / `GOODS` |
| `name` | text | 商品名（日本語） |
| `name_zh_tw` | text | 商品名（繁体字中文） |
| `price_yen` | int | 基本価格（円） |
| `can_pickup` | bool | 店頭受け取り可否 |
| `can_ship` | bool | 配送可否 |
| `temp_zone` | enum | `AMBIENT` / `FROZEN` |
| `stock_qty` | int? | 在庫数（null=無制限） |
| `image_url` | text? | メイン画像URL |
| `images` | text[] | ギャラリー画像URL配列 |
| `food_label` | JSONB? | 食品表示情報（日本語） |
| `food_label_zh_tw` | JSONB? | 食品表示情報（繁体字） |
| `has_variants` | bool | バリアント有無 |
| `is_active` | bool | 公開フラグ |
| `sort_order` | int | 表示順 |

#### orders

| カラム | 型 | 説明 |
|-------|-----|------|
| `id` | UUID | PK |
| `order_no` | text | 注文番号（`YYYYMMDD-xxxxxxxx`） |
| `order_type` | enum | `PICKUP` / `SHIPPING` |
| `status` | enum | 下記ステータスフロー参照 |
| `payment_method` | enum | `STRIPE` / `PAY_AT_PICKUP` |
| `temp_zone` | enum? | `AMBIENT` / `FROZEN`（SHIPPINGのみ） |
| `subtotal_yen` | int | 小計 |
| `shipping_fee_yen` | int | 送料 |
| `total_yen` | int | 合計（= subtotal + shipping） |
| `customer_name` | text | 顧客名 |
| `customer_phone` | text | 電話番号 |
| `customer_email` | text? | メールアドレス |
| `pickup_date` | text? | 受取日（PICKUP時） |
| `pickup_time` | text? | 受取時間（PICKUP時） |
| `user_id` | UUID? | ログインユーザーID（ゲスト注文はnull） |
| `locale` | text | 注文時ロケール（`ja` / `zh-tw`） |
| `admin_note` | text? | 管理者メモ |

#### payments

| カラム | 型 | 説明 |
|-------|-----|------|
| `provider` | text | `'stripe'` / `'on_site'` |
| `status` | enum | `INIT` → `LINK_CREATED` → `SUCCEEDED` |
| `stripe_session_id` | text? | Stripe Checkout Session ID |
| `stripe_payment_intent_id` | text? | Stripe PaymentIntent ID |
| `stripe_environment` | text? | `'test'` / `'live'` |
| `idempotency_key` | text? | 冪等キー |

### ステータスフロー

```
店頭払い（PAY_AT_PICKUP）:
  RESERVED → [管理者: mark-paid] → PAID → FULFILLED

Stripe決済（店頭受け取り）:
  PENDING_PAYMENT → [Webhook: checkout.session.completed] → PAID → FULFILLED

Stripe決済（配送）:
  PENDING_PAYMENT → [Webhook] → PAID → PACKING → [管理者: ship] → SHIPPED → FULFILLED

キャンセル（いずれのフローからも）:
  ～ → CANCELED
  ～ → REFUNDED
```

### データ制約

1. **total_consistency**: `total_yen = subtotal_yen + shipping_fee_yen`
2. **shipping_rules**: SHIPPING注文は決済方法がSTRIPEかつtemp_zone指定が必須
3. **line_total**: `line_total_yen = unit_price_yen * qty`

---

## 8. API リファレンス

### 共通レスポンス形式

```typescript
// 成功
{ "ok": true, "data": { ... } }

// エラー
{ "ok": false, "error": "error_code", "message": "詳細メッセージ" }
```

---

### 顧客向け API

#### POST /api/orders/pickup

店頭受け取り注文を作成する。レート制限・CSRF保護あり。

**Request Body:**

```json
{
  "customer": {
    "name": "山田 太郎",
    "phone": "090-1234-5678",
    "email": "taro@example.com"
  },
  "items": [
    { "productId": "uuid-1", "qty": 2 },
    { "productId": "uuid-2", "variantId": "uuid-variant-1", "qty": 1 }
  ],
  "paymentMethod": "PAY_AT_PICKUP",
  "pickupDate": "2026-04-01",
  "pickupTime": "12:00",
  "notes": "メモ（任意）",
  "agreementAccepted": true
}
```

`paymentMethod` は `"STRIPE"` または `"PAY_AT_PICKUP"`。

**Response（店頭払い）:**

```json
{
  "ok": true,
  "data": {
    "orderId": "uuid-order",
    "orderNo": "20260401-abcdef12",
    "status": "RESERVED",
    "paymentMethod": "PAY_AT_PICKUP",
    "totalYen": 1800
  }
}
```

**Response（Stripe決済）:**

```json
{
  "ok": true,
  "data": {
    "orderId": "uuid-order",
    "orderNo": "20260401-abcdef12",
    "status": "PENDING_PAYMENT",
    "paymentMethod": "STRIPE",
    "totalYen": 1800,
    "checkoutUrl": "https://checkout.stripe.com/pay/..."
  }
}
```

---

#### POST /api/orders/shipping

配送注文を作成する（Stripe決済必須）。

**Request Body:**

```json
{
  "customer": {
    "name": "山田 太郎",
    "phone": "090-1234-5678",
    "email": "taro@example.com"
  },
  "address": {
    "postalCode": "160-0022",
    "pref": "東京都",
    "city": "新宿区",
    "address1": "新宿1-2-3",
    "address2": "ハイツ101"
  },
  "items": [
    { "productId": "uuid-frozen", "qty": 3 }
  ],
  "agreementAccepted": true
}
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "orderId": "uuid-order",
    "orderNo": "20260401-abcdef12",
    "orderType": "SHIPPING",
    "status": "PENDING_PAYMENT",
    "subtotalYen": 3600,
    "shippingFeeYen": 1200,
    "totalYen": 4800,
    "checkoutUrl": "https://checkout.stripe.com/pay/..."
  }
}
```

---

#### GET /api/orders/by-no/[orderNo]

注文番号で注文を検索する（完了ページでの注文確認に使用）。

**Response:**

```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "order_no": "20260401-abcdef12",
    "status": "PAID",
    "total_yen": 4800,
    ...
  }
}
```

---

#### GET /api/products

商品一覧を取得する。

**Query Parameters:**

| パラメータ | 説明 |
|----------|------|
| `mode` | `pickup` または `shipping`（省略可） |
| `kind` | `FROZEN_FOOD` または `GOODS`（省略可） |

---

#### GET /api/news

公開済みニュース一覧を取得する（最新順）。

---

#### GET /api/postal-code/lookup?code=[郵便番号]

郵便番号から住所を検索する（外部API連携）。

---

#### POST /api/auth/signup

ユーザー登録 + プロフィール・住所保存。

---

### マイページ API（認証必須）

すべて `requireCustomer()` による認証ガードあり。

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/mypage/orders` | 自分の注文一覧 |
| GET | `/api/mypage/orders/[id]` | 注文詳細 |
| GET | `/api/mypage/addresses` | 住所一覧 |
| POST | `/api/mypage/addresses` | 住所追加 |
| PUT | `/api/mypage/addresses/[id]` | 住所更新 |
| DELETE | `/api/mypage/addresses/[id]` | 住所削除 |

---

### 管理者 API（管理者認証必須）

すべて `requireAdmin()` または `adminWriteGuard()` による認証ガードあり。

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/admin/orders` | 注文一覧（フィルタ・ページネーション対応） |
| GET | `/api/admin/orders/[id]` | 注文詳細（items, address, shipments, payments含む） |
| POST | `/api/admin/orders/[id]/mark-paid` | 入金確認（RESERVED → PAID） |
| POST | `/api/admin/orders/[id]/ship` | 発送登録（PAID/PACKING → SHIPPED、追跡番号登録） |
| GET | `/api/admin/products` | 商品一覧（バリアント含む） |
| POST | `/api/admin/products` | 商品作成 |
| PUT | `/api/admin/products/[id]` | 商品更新 |
| DELETE | `/api/admin/products/[id]` | 商品削除 |
| POST | `/api/admin/upload` | 画像アップロード（Supabase Storage） |
| GET | `/api/admin/news` | ニュース一覧（未公開含む） |
| POST | `/api/admin/news` | ニュース作成 |
| PUT | `/api/admin/news/[id]` | ニュース更新 |
| DELETE | `/api/admin/news/[id]` | ニュース削除 |

---

### Webhook

#### POST /api/webhooks/stripe

Stripe Webhookを受信・処理する。

**処理フロー:**

```
1. Stripe署名検証（STRIPE_WEBHOOK_SECRET）
   ↓ 失敗 → 400
2. event_id で冪等性チェック（stripe_webhook_events テーブル）
   ↓ 重複 → 200 OK（再処理スキップ）
3. イベント種別分岐:
   ├── checkout.session.completed
   │     → payments.status = SUCCEEDED
   │     → orders.status = PAID
   │     → 注文確認メール送信
   └── checkout.session.expired
         → orders.status = CANCELED
4. 200 OK
```

---

## 9. 認証・セキュリティ

### レート制限（src/lib/security/rate-limit.ts）

インメモリ（スライディングウィンドウ方式）。

| エンドポイント | 制限 |
|-------------|------|
| 注文API (`/api/orders/*`) | 10 req/分/IP |
| Webhook (`/api/webhooks/*`) | 100 req/分/IP（Stripeリトライ対応） |
| 管理者API (`/api/admin/*`) | 30 req/分/IP |

IP取得: `x-forwarded-for` → `x-real-ip` → `"unknown"` の優先順で取得。

### CSRF保護（src/lib/security/csrf.ts）

Origin / Referer ヘッダーを検証。

- 許可オリジン: `NEXT_PUBLIC_APP_URL` + 開発環境ローカルURL
- 開発環境ではOriginなしも許可
- `/api/webhooks/` は除外（Stripe署名検証で保護）

### セキュリティヘッダー

`next.config.ts` および `src/middleware.ts` で設定。

| ヘッダー | 値 |
|--------|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

### セキュアログ（src/lib/logging/secure-logger.ts）

PII（個人情報）を自動マスクして出力する。

| 対象 | 処理 |
|-----|------|
| メールアドレス | `***@***.***` に置換 |
| 電話番号 | `***-****-****` に置換 |
| 郵便番号 | `***-****` に置換 |
| クレジットカード番号 | `****-****-****-****` に置換 |
| `email`, `phone`, `password`, `token`, `secret` キー | `[REDACTED]` に置換 |
| エラーの `stack` | 開発環境のみ出力 |

### 入力バリデーション（src/lib/validation/schemas.ts）

Zodスキーマで全APIエンドポイントの入力を検証する。

| スキーマ | 説明 |
|---------|------|
| `pickupOrderSchema` | 店頭注文（顧客情報・商品・支払方法） |
| `shippingOrderSchema` | 配送注文（顧客情報・住所・商品） |
| `phoneSchema` | 日本の電話番号（`0[0-9\-]{9,13}$`） |
| `postalCodeSchema` | 日本の郵便番号（`\d{3}-?\d{4}$`） |
| `adminProductCreateSchema` | 商品作成（名前・スラッグ・価格など） |

---

## 10. 国際化（i18n）

### 設定（src/i18n/routing.ts）

```typescript
locales: ['ja', 'zh-tw']
defaultLocale: 'ja'
localePrefix: 'always'   // 全URLに /ja/ または /zh-tw/ が付く
```

### フォント切り替え（src/app/[locale]/layout.tsx）

| ロケール | フォント |
|--------|--------|
| `ja` | Noto Sans JP (400, 500, 700) |
| `zh-tw` | Noto Sans TC (400, 500, 700) |

### メッセージファイル

- `messages/ja.json` — 日本語
- `messages/zh-tw.json` — 繁体字中文

### コンポーネント内での使用

```typescript
// Server Component
import { getTranslations } from 'next-intl/server';
const t = await getTranslations('namespace');

// Client Component
import { useTranslations } from 'next-intl';
const t = useTranslations('namespace');
```

### 多言語対応範囲

- 全UI文言（next-intl）
- 商品名・説明文（DBカラム: `name_zh_tw`, `description_zh_tw`）
- 食品表示情報（DBカラム: `food_label_zh_tw`）
- メール通知（locale パラメータで切り替え）
- OGP メタデータ（言語別 alternate links）

---

## 11. 決済フロー（Stripe）

### Stripe Checkout Session 作成

1. `/api/orders/pickup` または `/api/orders/shipping` にリクエスト
2. 注文レコード（`orders`, `order_items`）を作成
3. Stripe Checkout Session を作成
4. `payments` レコードを `LINK_CREATED` 状態で作成
5. `checkoutUrl` をレスポンスに含めて返却
6. フロントエンドが `checkoutUrl` にリダイレクト

### Webhook 処理

1. Stripeが決済完了後に `/api/webhooks/stripe` を呼び出す
2. 署名検証で正規リクエストか確認
3. `stripe_webhook_events` テーブルで冪等性確認（重複処理防止）
4. `checkout.session.completed` イベント:
   - `payments.status` → `SUCCEEDED`
   - `orders.status` → `PAID`
   - 注文確認メール送信
5. `checkout.session.expired` イベント:
   - `orders.status` → `CANCELED`

### ローカル開発での Webhook テスト

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## 12. メール通知

Resend SDKを使用。`src/lib/email/resend.ts` で実装。

| 関数 | トリガー | 受信者 |
|-----|---------|-------|
| `sendOrderConfirmationEmail` | 注文作成時（Webhook受信後） | 顧客 |
| `sendShippingNotificationEmail` | 発送登録時（`/admin/orders/[id]/ship`） | 顧客 |
| `sendPaymentConfirmationEmail` | 決済完了時（Webhook） | 顧客 |

メール本文はlocale（`ja` / `zh-tw`）に応じて言語を切り替える。

---

## 13. テスト

### テストファイル構成（13ファイル、133件）

```
src/
├── lib/
│   ├── __tests__/env.test.ts
│   ├── api/__tests__/
│   │   ├── order-guards.test.ts
│   │   └── price-calc.test.ts
│   ├── security/__tests__/
│   │   ├── rate-limit.test.ts
│   │   └── csrf.test.ts
│   ├── validation/__tests__/schemas.test.ts
│   ├── logging/__tests__/secure-logger.test.ts
│   └── utils/__tests__/format.test.ts
├── contexts/__tests__/CartContext.test.tsx
├── hooks/__tests__/usePostalCodeLookup.test.ts
└── app/api/
    ├── orders/__tests__/
    │   ├── pickup.test.ts
    │   └── shipping.test.ts
    └── webhooks/__tests__/stripe.test.ts
```

### テスト実行

```bash
npx vitest run                           # 全テスト（CI推奨）
npx vitest run src/lib/...               # 単一ファイル
npx vitest                               # ウォッチモード（開発中推奨）
npx vitest run --coverage                # カバレッジレポート
```

### テスト方針

- DB は **モック使用**（`vi.mock`）。実DBには接続しない。
- Stripe SDK もモック使用。
- セキュリティ系（レート制限・CSRF・セキュアログ）はロジックのユニットテストを重視。
- API Routes テストは実際のリクエスト/レスポンス形式を検証。

---

## 14. デプロイ・インフラ

### Supabase

- **プロジェクトURL**: `NEXT_PUBLIC_SUPABASE_URL`
- **RLS (Row Level Security)**: `supabase/migrations/00011_fix_rls_policies.sql` で設定
- **Storage**: 商品画像用バケット（`supabase/migrations/00002_storage_bucket.sql`）
- **Auth**: メール/パスワード認証（顧客・管理者）

### Stripe

- **環境**: `STRIPE_SECRET_KEY` のプレフィックスで `test` / `live` を判定
- **Webhook**: 本番デプロイ後にStripeダッシュボードでWebhook URLを設定
- **APIバージョン**: `2025-12-15.clover`

### セキュリティ注意事項

- `SUPABASE_SERVICE_ROLE_KEY` は絶対に公開しない
- `STRIPE_SECRET_KEY` は絶対に公開しない
- `.env.local` は `.gitignore` に含まれていることを確認
- インメモリレート制限はサーバー再起動でリセットされる（本番では Redis 等の検討を推奨）
