# momo-payment 技術ドキュメント

> **最終更新**: 2026-06-23
> **対象バージョン**: 現在の実装状態（配送EC専用・Stripe決済・3言語対応）

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

「もも娘」のオンライン注文システム。冷凍食品・グッズの配送ECを提供する。

| 購入体験 | 説明 | 決済 |
|---------|------|------|
| **配送EC（SHIPPING）** | 冷凍食品・グッズのオンライン配送 | Stripe（必須） |

### 重要な制約

- **配送EC専用**: 全注文が SHIPPING・Stripe オンライン決済。店頭受け取り（PICKUP）/店頭払い（PAY_AT_PICKUP）/Square は廃止済み。
- **温度帯混在禁止**: 冷凍食品（FROZEN）とグッズ（AMBIENT）の同時購入は不可。別注文にする。
- **送料**: 配送先都道府県に応じた地帯別運賃（佐川急便 飛脚宅配便・福島発の運賃表ベース）＋箱代。固定送料ではない（`src/lib/shipping/`）。

---

## 2. 技術スタック

| カテゴリ | ライブラリ | バージョン |
|---------|-----------|-----------|
| フレームワーク | Next.js | ^15.5.19 (App Router) |
| 言語 | TypeScript | 5.x |
| UI ランタイム | React | 19.2.3 |
| UIコンポーネント | MUI (Material UI) | ^7.3.6（@mui/material-nextjs で App Router 統合） |
| スタイリング | Tailwind CSS | 4.x |
| データベース | Supabase (PostgreSQL) | @supabase/supabase-js ^2.89.0 |
| 認証 | Supabase Auth | @supabase/ssr ^0.8.0 |
| 決済 | Stripe | ^20.1.2（API バージョン `2025-12-15.clover`） |
| メール | Resend | ^6.6.0 |
| 国際化 | next-intl | ^4.13.0 |
| バリデーション | Zod | ^4.3.5 |
| 日付処理 | date-fns | ^4.1.0 |
| Google Calendar 連携 | google-auth-library | ^10.6.2（台湾夜市カレンダー読み取り） |
| Markdown（ニュース本文） | react-markdown / remark-gfm / rehype-sanitize | ^10.1.0 / ^4.0.1 / ^6.0.0 |
| 画像クロップ（管理画面） | react-easy-crop | ^5.5.7 |
| テスト | Vitest | ^4.0.17 |

---

## 3. ディレクトリ構成

```
momo-payment/
├── src/
│   ├── app/
│   │   ├── [locale]/                   # ロケールプレフィックス付きページ
│   │   │   ├── layout.tsx              # ロケール別レイアウト（フォント切替、OGP）
│   │   │   ├── page.tsx                # トップページ（Hero + ニュース）
│   │   │   ├── shop/                   # 配送EC商品一覧
│   │   │   │   └── [slug]/             # 商品詳細
│   │   │   ├── cart/                   # カート（温度帯混在チェック）
│   │   │   ├── checkout/
│   │   │   │   └── shipping/           # 配送チェックアウト（住所・配送日時入力）
│   │   │   ├── complete/               # 注文完了
│   │   │   ├── login/                  # ユーザーログイン/新規登録
│   │   │   ├── mypage/                 # マイページ
│   │   │   │   ├── page.tsx            # 注文履歴
│   │   │   │   ├── addresses/          # 配送先住所管理
│   │   │   │   └── orders/[id]/        # 注文詳細
│   │   │   ├── news/                   # ニュース一覧
│   │   │   │   └── [slug]/             # ニュース詳細
│   │   │   ├── contact/                # お問い合わせ
│   │   │   ├── taiwan-night-market/    # 台湾夜市特設ページ
│   │   │   └── legal/
│   │   │       ├── tokushoho/          # 特定商取引法表記
│   │   │       └── privacy/            # プライバシーポリシー
│   │   ├── admin/                      # 管理画面（ロケール不要）
│   │   │   ├── login/                  # 管理者ログイン
│   │   │   ├── dashboard/              # 売上ダッシュボード
│   │   │   ├── products/               # 商品管理（CRUD・在庫・食品表示・並び替え）
│   │   │   ├── news/                   # ニュース管理
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx            # 注文一覧（絞り込み・ページネーション・CSV）
│   │   │   │   └── [id]/               # 注文詳細・管理
│   │   │   ├── audit-logs/             # 監査ログ閲覧
│   │   │   └── iitate-calendar/        # 台湾夜市カレンダー管理
│   │   └── api/
│   │       ├── products/               # GET: 商品一覧
│   │       ├── news/                   # GET: ニュース一覧（公開）
│   │       ├── auth/signup/            # POST: ユーザー登録
│   │       ├── postal-code/lookup/     # GET: 郵便番号検索
│   │       ├── health/                 # GET: ヘルスチェック
│   │       ├── iitate-calendar/        # GET: 台湾夜市カレンダー（公開）
│   │       ├── orders/
│   │       │   ├── shipping/           # POST: 配送注文作成
│   │       │   └── by-no/[orderNo]/    # GET: 注文番号検索
│   │       ├── mypage/
│   │       │   ├── orders/             # GET: ユーザー注文一覧
│   │       │   │   └── [id]/           # GET: 注文詳細
│   │       │   └── addresses/          # CRUD: 配送先住所管理
│   │       ├── webhooks/stripe/        # POST: Stripe Webhook
│   │       └── admin/
│   │           ├── products/           # CRUD: 商品管理
│   │           │   └── reorder/        # POST: 商品並び替え
│   │           ├── news/               # CRUD: ニュース管理
│   │           ├── upload/             # POST: 画像アップロード
│   │           ├── dashboard/          # GET: 売上ダッシュボード集計
│   │           ├── audit-logs/         # GET: 監査ログ
│   │           ├── iitate-calendar/    # CRUD: 台湾夜市カレンダー（events / month-notes）
│   │           └── orders/
│   │               ├── route.ts        # GET: 注文一覧
│   │               ├── export/         # GET: 注文CSVエクスポート
│   │               └── [id]/
│   │                   ├── route.ts    # GET: 注文詳細
│   │                   ├── ship/       # POST: 発送登録
│   │                   ├── refund/     # POST: 返金
│   │                   └── resend-email/ # POST: メール再送
│   ├── contexts/
│   │   ├── CartContext.tsx             # カート状態管理（localStorage永続化）
│   │   └── AuthContext.tsx             # ユーザー認証状態管理
│   ├── hooks/
│   │   ├── usePostalCodeLookup.ts      # 郵便番号→住所検索フック
│   │   └── useFetch.ts                 # GET取得の定型を集約するフック
│   ├── types/
│   │   └── database.ts                 # 全DBモデルの型定義
│   ├── middleware.ts                   # セキュリティヘッダー・CSP nonce・i18n・セッションリフレッシュ
│   ├── i18n/
│   │   ├── routing.ts                  # next-intl ルーティング設定
│   │   └── request.ts                  # リクエスト単位のメッセージ解決
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
│       ├── shipping/
│       │   ├── zones.ts                # 都道府県→配送地帯・運賃・お届け日数
│       │   ├── calc.ts                 # 送料・最短お届け日の計算（純関数）
│       │   ├── time-slots.ts           # 配送時間帯の定義
│       │   └── index.ts                # 再エクスポート
│       ├── security/
│       │   ├── rate-limit.ts           # 永続レート制限（Supabase RPC）
│       │   └── csrf.ts                 # CSRF保護（Origin/Referer検証）
│       ├── validation/
│       │   └── schemas.ts              # Zodバリデーションスキーマ
│       ├── logging/
│       │   ├── secure-logger.ts        # PIIマスク付きログ
│       │   └── audit-log.ts            # 監査ログ記録
│       ├── storage/
│       │   └── upload.ts               # 画像アップロード（Supabase Storage）
│       ├── seo/
│       │   └── structured-data.ts      # JSON-LD 構造化データ生成
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
│       │   ├── product-queries.ts      # 商品クエリ
│       │   └── localize.ts             # APIレスポンスのi18nローカライズ
│       ├── calendar/                   # Google Calendar 連携（台湾夜市）
│       └── mui/
│           ├── theme.ts                # MUIテーマ（ピンク・ゴールド配色）
│           └── ThemeRegistry.tsx       # App Router + MUI統合
├── messages/
│   ├── ja.json                         # 日本語翻訳メッセージ
│   ├── zh-tw.json                      # 繁体字中文翻訳メッセージ
│   └── en.json                         # 英語翻訳メッセージ
├── supabase/
│   └── migrations/                     # DBマイグレーション（00001〜00027）
├── docs/                               # 各種設計・運用ドキュメント（本ファイル含む）
├── scripts/
│   ├── seed.ts                         # DBシードデータ
│   └── create-admin.ts                 # 管理者アカウント作成
├── .github/workflows/ci.yml            # CI（lint / typecheck / test / npm audit / build）
├── next.config.ts                      # Next.js設定（セキュリティヘッダー・画像・i18n）
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

# Email（本番では必須。開発/テストでは任意）
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@example.com
ADMIN_EMAIL=admin@example.com

# Google Calendar（台湾夜市カレンダーの読み取り元。本番では必須・開発/テストでは任意）
GOOGLE_CALENDAR_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=xxxxxxxx@group.calendar.google.com
GOOGLE_CALENDAR_TIMEZONE=Asia/Tokyo   # 省略時 Asia/Tokyo

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> 送料は環境変数ではなく `src/lib/shipping/zones.ts` の運賃表で定義する（旧 `SHIPPING_FEE_YEN` は廃止）。

### 環境変数バリデーション（src/lib/env.ts）

アプリ起動時にZodで検証し、不正な値があれば起動を中断する。

| 変数 | 検証ルール |
|-----|---------|
| `STRIPE_SECRET_KEY` | `sk_` で始まること |
| `STRIPE_WEBHOOK_SECRET` | `whsec_` で始まること |
| `NEXT_PUBLIC_SUPABASE_URL` | 有効なURL形式 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | 必須 |
| `NEXT_PUBLIC_APP_URL` | 有効なURL形式 |
| `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL` | **`NODE_ENV=production` では必須**（それ以外は任意） |
| `GOOGLE_CALENDAR_CLIENT_EMAIL` / `GOOGLE_CALENDAR_PRIVATE_KEY` / `GOOGLE_CALENDAR_ID` | **`NODE_ENV=production` では必須**（それ以外は任意。未設定時は空イベント応答） |
| `GOOGLE_CALENDAR_TIMEZONE` | 任意（デフォルト `Asia/Tokyo`） |

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
npm test                                 # 全テスト実行（vitest run）
npx vitest run src/path/to/test.ts       # 単一ファイル実行
npx vitest                               # ウォッチモード
npx vitest run --coverage                # カバレッジ

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
  ├── 全ルート     → セキュリティヘッダー + per-request CSP nonce 付与
  ├── /admin/*     → Supabaseセッションリフレッシュ
  ├── /api/*       → PII返却APIに Cache-Control: private, no-store を付与
  └── /[locale]/*  → next-intl ミドルウェア（ロケール検出）
           └── /[locale]/mypage, /login, /checkout/shipping
                   → Supabaseセッションリフレッシュ
```

### Supabase クライアント使い分け

| クライアント | ファイル | 用途 | キー |
|------------|--------|------|-----|
| Admin | `src/lib/supabase/admin.ts` | API Routes（RLS無視） | Service Role |
| Server | `src/lib/supabase/server.ts` | SSR / Server Components（セッション考慮） | Anon |
| Client | `src/lib/supabase/client.ts` | ブラウザコンポーネント | Anon |

> mypage / admin API は Service Role クライアント（RLSバイパス）を使うため、RLS は IDOR のバックストップにならない。`.eq('user_id', ...)` 等の WHERE 句が唯一の認可ゲートとなる。新規 API 追加時は所有者条件の付与が必須レビュー観点。

### 認証ガード

```typescript
// 管理者専用 API
const { supabase, user } = await requireAdmin();

// 顧客専用 API（未ログインはエラー）
const { supabase, user } = await requireCustomer();

// 注文 API（未ログインでも可、user_id は null になる）
const { userId } = await orderGuard(request);  // レート制限 + CSRF も実行
```

### 送料・配送日時の計算（src/lib/shipping/）

- `zones.ts`: 都道府県 → 配送地帯（13地帯）・60サイズ基本運賃（640〜680円）・お届け日数（transit）。
- `calc.ts`: 送料 = 地帯別基本運賃 + 箱代（`BOX_FEE_YEN` = 200円）。最短お届け日 = 注文日 + transit + 店側準備日数（`PREP_DAYS` = 2日）。お届け希望日は最短日〜注文日+14日の範囲。すべて JST 基準・`YYYY-MM-DD` 文字列で扱う純関数。
- 沖縄県は佐川運賃表の対象外のため、暫定的に南九州と同額（680円）で代用している（`ZONE_TO_BASE_FEE.OKINAWA`）。正式運賃が決まり次第差し替える。

### MUI テーマ（src/lib/mui/theme.ts）

```
Primary: ピンク #FF6680（桃のイメージ）
Secondary: ゴールド #FFC107（アクセント）
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
| `00003_add_paid_at.sql` | `orders.paid_at` カラム追加 |
| `00004_add_product_images.sql` | `products.images` 配列カラム追加 |
| `00005_add_product_variants.sql` | `product_variants` テーブル作成 |
| `00006_add_stripe_support.sql` | Stripe対応（`stripe_session_id` 等） |
| `00007_update_orders_constraint.sql` | Stripe対応での制約更新 |
| `00008_add_customer_accounts.sql` | `customer_profiles` / `customer_addresses` テーブル |
| `00009_add_order_locale.sql` | `orders.locale` カラム追加 |
| `00010_add_product_i18n.sql` | `products` に繁体字中文翻訳カラム追加 |
| `00011_fix_rls_policies.sql` | RLS ポリシー調整 |
| `00012_create_news_table.sql` | `news` テーブル作成 |
| `00013_security_fixes.sql` | セキュリティ修正（インデックス・ポリシー） |
| `00014_create_iitate_calendar_tables.sql` | 台湾夜市カレンダー（イベント・月次メモ） |
| `00015_security_hardening.sql` | DBハードニング（`generate_order_no` を VOLATILE 化・`payments` UNIQUE 等） |
| `00016_rate_limit_buckets.sql` | 永続レート制限ストア（`rate_limit_buckets` + RPC `check_rate_limit`） |
| `00017_add_delivery_schedule.sql` | `orders.delivery_date` / `delivery_time_slot` 追加 |
| `00018_variant_stock_decrement.sql` | 在庫減算 RPC `decrement_variant_stock` |
| `00019_products_reorder_rpc.sql` | 商品並び替え RPC `reorder_products` |
| `00020_security_advisors_hardening.sql` | 関数の `search_path` 固定・Storageポリシー整理 |
| `00021_add_news_i18n.sql` | `news` に繁体字中文翻訳カラム追加 |
| `00022_add_news_en_i18n.sql` | `news` に英語（en）翻訳カラム追加 |
| `00023_add_product_en_i18n.sql` | `products` に英語（en）翻訳カラム追加 |
| `00024_add_refund_tracking.sql` | `orders` / `payments` に返金トラッキング列追加 |
| `00025_create_audit_logs.sql` | `audit_logs` テーブル + RLS |
| `00026_remove_pickup.sql` | PICKUP/PAY_AT_PICKUP/Square/RESERVED を撤去し配送EC専用化（enum・CHECK再作成） |
| `00027_add_news_image.sql` | `news.image_url` 追加 |

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
iitate_calendar_events / iitate_calendar_month_notes（台湾夜市カレンダー）
audit_logs（管理操作の監査ログ）
rate_limit_buckets（永続レート制限）
```

### 主要テーブル

#### products

| カラム | 型 | 説明 |
|-------|-----|------|
| `id` | UUID | PK |
| `slug` | text | URL用識別子（一意） |
| `kind` | enum | `FROZEN_FOOD` / `GOODS` |
| `name` / `name_zh_tw` / `name_en` | text | 商品名（日本語 / 繁体字 / 英語） |
| `price_yen` | int | 基本価格（円） |
| `can_ship` | bool | 配送可否 |
| `temp_zone` | enum | `AMBIENT` / `FROZEN` |
| `stock_qty` | int? | 在庫数（null=無制限） |
| `image_url` | text? | メイン画像URL |
| `images` | text[] | ギャラリー画像URL配列 |
| `food_label` / `food_label_zh_tw` | JSONB? | 食品表示情報（日本語 / 繁体字） |
| `has_variants` | bool | バリアント有無 |
| `is_active` | bool | 公開フラグ |
| `sort_order` | int | 表示順 |

#### orders

| カラム | 型 | 説明 |
|-------|-----|------|
| `id` | UUID | PK |
| `order_no` | text | 注文番号（`YYYYMMDD-xxxxxxxx`） |
| `order_type` | enum | `SHIPPING`（唯一値） |
| `status` | enum | 下記ステータスフロー参照 |
| `payment_method` | enum | `STRIPE`（唯一値） |
| `temp_zone` | enum? | `AMBIENT` / `FROZEN` |
| `subtotal_yen` / `shipping_fee_yen` / `total_yen` | int | 小計 / 送料 / 合計 |
| `customer_name` / `customer_phone` / `customer_email` | text(?) | 顧客情報 |
| `delivery_date` | date? | 配送希望日 |
| `delivery_time_slot` | text? | 配送時間帯（`UNSPECIFIED`/`AM`/`T12_14`/`T14_16`/`T16_18`/`T18_21`） |
| `agreement_accepted` | bool | 規約同意 |
| `user_id` | UUID? | ログインユーザーID（ゲスト注文はnull） |
| `locale` | text | 注文時ロケール（`ja` / `zh-tw` / `en`） |
| `admin_note` | text? | 管理者メモ |
| `paid_at` / `refunded_at` | timestamptz? | 入金日時 / 返金日時 |
| `lookup_token` | text? | ゲスト注文照会トークン |

#### payments

| カラム | 型 | 説明 |
|-------|-----|------|
| `provider` | text | `'stripe'`（Square 列はレガシーとして残置・未使用） |
| `status` | enum | `INIT` → `LINK_CREATED` → `SUCCEEDED`（返金時 `REFUNDED`） |
| `amount_yen` | int | 金額 |
| `stripe_session_id` | text? | Stripe Checkout Session ID（UNIQUE） |
| `stripe_payment_intent_id` | text? | Stripe PaymentIntent ID |
| `stripe_refund_id` | text? | Stripe Refund ID（00024） |
| `stripe_environment` | text? | `'test'` / `'live'` |
| `idempotency_key` | text? | 冪等キー（UNIQUE） |
| `refunded_at` | timestamptz? | 返金日時（00024） |

### ステータスフロー

```
配送EC（Stripe決済）:
  PENDING_PAYMENT → [Webhook: checkout.session.completed] → PAID → PACKING → [管理者: ship] → SHIPPED → FULFILLED

キャンセル（決済前失効）:
  PENDING_PAYMENT → [Webhook: checkout.session.expired] → CANCELED

返金:
  PAID 以降 → [管理者: refund] → REFUNDED
```

### データ制約

1. **orders_total_consistency**: `total_yen = subtotal_yen + shipping_fee_yen`
2. **orders_shipping_rules**: `order_type = 'SHIPPING' AND payment_method = 'STRIPE' AND temp_zone IS NOT NULL`（00026 で再作成）
3. **order_items_line_total**: `line_total_yen = unit_price_yen * qty`
4. **orders_delivery_time_slot_check**: 配送時間帯は `UNSPECIFIED/AM/T12_14/T14_16/T16_18/T18_21` のいずれか

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

#### POST /api/orders/shipping

配送注文を作成する（Stripe決済必須）。レート制限・CSRF保護あり。送料は配送先都道府県から算出され、バリアント在庫もチェックする。

**Request Body:**

```json
{
  "customer": { "name": "山田 太郎", "phone": "090-1234-5678", "email": "taro@example.com" },
  "address": { "postalCode": "160-0022", "pref": "東京都", "city": "新宿区", "address1": "新宿1-2-3", "address2": "ハイツ101" },
  "deliveryDate": "2026-06-25",
  "deliveryTimeSlot": "T14_16",
  "items": [ { "productId": "uuid-frozen", "qty": 3 } ],
  "agreementAccepted": true
}
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "orderId": "uuid-order", "orderNo": "20260401-abcdef12", "orderType": "SHIPPING",
    "status": "PENDING_PAYMENT", "subtotalYen": 3600, "shippingFeeYen": 840, "totalYen": 4440,
    "checkoutUrl": "https://checkout.stripe.com/pay/..."
  }
}
```

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/products` | 商品一覧（`kind` クエリで絞り込み） |
| GET | `/api/news` | 公開済みニュース一覧（最新順） |
| GET | `/api/postal-code/lookup?code=` | 郵便番号から住所検索 |
| GET | `/api/orders/by-no/[orderNo]` | 注文番号で注文照会（完了ページ） |
| GET | `/api/iitate-calendar` | 台湾夜市カレンダー（公開） |
| GET | `/api/health` | ヘルスチェック |
| POST | `/api/auth/signup` | ユーザー登録 + プロフィール・住所保存（CSRF・レート制限あり） |

---

### マイページ API（認証必須・`requireCustomer()`）

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/mypage/orders` | 自分の注文一覧 |
| GET | `/api/mypage/orders/[id]` | 注文詳細 |
| GET/POST | `/api/mypage/addresses` | 住所一覧 / 追加 |
| PUT/DELETE | `/api/mypage/addresses/[id]` | 住所更新 / 削除 |

---

### 管理者 API（管理者認証必須・`requireAdmin()` / `adminWriteGuard()`）

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/admin/orders` | 注文一覧（フィルタ・ページネーション） |
| GET | `/api/admin/orders/export` | 注文CSVエクスポート |
| GET | `/api/admin/orders/[id]` | 注文詳細（items, address, shipments, payments） |
| POST | `/api/admin/orders/[id]/ship` | 発送登録（PAID/PACKING → SHIPPED、追跡番号） |
| POST | `/api/admin/orders/[id]/refund` | 返金（→ REFUNDED） |
| POST | `/api/admin/orders/[id]/resend-email` | 注文確認・発送通知メールの再送 |
| GET/POST | `/api/admin/products` | 商品一覧 / 作成 |
| PUT/DELETE | `/api/admin/products/[id]` | 商品更新 / 削除 |
| POST | `/api/admin/products/reorder` | 商品並び替え |
| GET/POST | `/api/admin/news` | ニュース一覧（未公開含む）/ 作成 |
| PUT/DELETE | `/api/admin/news/[id]` | ニュース更新 / 削除 |
| POST | `/api/admin/upload` | 画像アップロード（Supabase Storage） |
| GET | `/api/admin/dashboard` | 売上ダッシュボード集計 |
| GET | `/api/admin/audit-logs` | 監査ログ |
| CRUD | `/api/admin/iitate-calendar/events` `.../month-notes` | 台湾夜市カレンダー管理 |

---

### Webhook

#### POST /api/webhooks/stripe

Stripe Webhookを受信・処理する。

```
1. Stripe署名検証（STRIPE_WEBHOOK_SECRET）        … 失敗 → 400
2. event_id で冪等性チェック（stripe_webhook_events）… 重複 → 200 OK（スキップ）
3. イベント種別分岐:
   ├── checkout.session.completed
   │     → payments.status = SUCCEEDED / orders.status = PAID / paid_at 記録
   │     → 在庫減算（RPC decrement_variant_stock）/ 注文確認メール送信
   └── checkout.session.expired
         → orders.status = CANCELED
4. 200 OK
```

---

## 9. 認証・セキュリティ

### レート制限（src/lib/security/rate-limit.ts）

**永続ストア方式**（Supabase Postgres の RPC `check_rate_limit` を 1 往復・原子的に呼ぶ）。サーバレスで水平スケールしても共有カウンタとして機能する（旧インメモリ方式から `00016` で移行）。DB障害時はフェイルオープン（サービス継続を優先・warn ログ）。

| エンドポイント | 制限 |
|-------------|------|
| 注文API (`/api/orders/*`) | 10 req/分/IP |
| Webhook (`/api/webhooks/*`) | 100 req/分/IP（Stripeリトライ対応） |
| 管理者API (`/api/admin/*`) | 30 req/分/IP |
| 認証API（signup 等） | 5 req/分/IP（ブルートフォース対策） |

IP取得: `x-nf-client-connection-ip`（Netlify・最優先）→ `x-real-ip` → `x-forwarded-for` → `"unknown"`。

> 注: 顧客・管理者ログインは `signInWithPassword` をブラウザから直接 Supabase に送るため、アプリのレート制限を通らない。ログインのブルートフォース対策は Supabase 側の Auth Rate Limits / Attack Protection が担う。

### CSRF保護（src/lib/security/csrf.ts）

Origin / Referer ヘッダーを検証。

- 許可オリジン: `NEXT_PUBLIC_APP_URL` + 開発環境ローカルURL
- 開発環境ではOriginなしも許可
- `/api/webhooks/` は除外（Stripe署名検証で保護）

### セキュリティヘッダー

`next.config.ts`（共通ヘッダ）と `src/middleware.ts`（per-request CSP nonce）で設定。

| ヘッダー | 値 |
|--------|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-DNS-Prefetch-Control` | `on` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), accelerometer=(), gyroscope=(), magnetometer=(), payment=(self), usb=(), autoplay=(), fullscreen=(self), interest-cohort=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Content-Security-Policy` | middleware で per-request nonce 付きで付与 |

> CSP は per-request nonce を導入済みだが、next-intl と Next.js の自動 nonce 付与が両立できず `script-src` に `'unsafe-inline'` が残る（`'unsafe-eval'` は本番のみ除去）。完全な strict-dynamic 化は今後の課題。

### セキュアログ（src/lib/logging/secure-logger.ts）

PII（個人情報）を自動マスクして出力する。メール・電話番号・郵便番号・カード番号・氏名/住所/recipient/note 等を部分一致でマスクし、`email`/`phone`/`password`/`token`/`secret` キーは `[REDACTED]` に置換。エラーの `stack` は開発環境のみ出力。

### 監査ログ（src/lib/logging/audit-log.ts）

管理操作（発送・返金・メール再送等）を `audit_logs` テーブルに記録し、`/admin/audit-logs` で閲覧できる。

### 入力バリデーション（src/lib/validation/schemas.ts）

Zodスキーマで全APIエンドポイントの入力を検証する。電話番号・郵便番号は日本形式に対応（正規表現は単一ソースに統一）。

---

## 10. 国際化（i18n）

### 設定（src/i18n/routing.ts）

```typescript
locales: ['ja', 'zh-tw', 'en']
defaultLocale: 'ja'
localePrefix: 'as-needed'   // デフォルト(ja)はプレフィックスなし、zh-tw/en は /zh-tw /en が付く
```

### フォント切り替え（src/app/[locale]/layout.tsx）

| ロケール | フォント |
|--------|--------|
| `ja` | Noto Sans JP / Noto Serif JP |
| `zh-tw` | Noto Sans TC / Noto Serif TC |
| `en` | ラテン系（共通） |

### メッセージファイル

- `messages/ja.json` — 日本語
- `messages/zh-tw.json` — 繁体字中文
- `messages/en.json` — 英語

### 多言語対応範囲

- 全UI文言（next-intl）
- 商品名・説明文（DBカラム: `name_zh_tw`/`name_en` 等）
- 食品表示情報（DBカラム: `food_label_zh_tw`）
- ニュース（`title_zh_tw`/`title_en` 等）
- メール通知（locale パラメータで切り替え）
- OGP メタデータ・SEO（言語別 alternate links）

---

## 11. 決済フロー（Stripe）

### Stripe Checkout Session 作成

1. `/api/orders/shipping` にリクエスト（送料は配送先から算出）
2. 注文レコード（`orders`, `order_items`）を作成
3. Stripe Checkout Session を作成
4. `payments` レコードを `LINK_CREATED` 状態で作成
5. `checkoutUrl` をレスポンスに含めて返却 → フロントがリダイレクト

### Webhook 処理

1. Stripeが決済完了後に `/api/webhooks/stripe` を呼び出す
2. 署名検証 → `stripe_webhook_events` で冪等性確認
3. `checkout.session.completed`: `payments.status=SUCCEEDED` / `orders.status=PAID` / `paid_at` 記録 / 在庫減算 / 注文確認メール
4. `checkout.session.expired`: `orders.status=CANCELED`

### ローカル開発での Webhook テスト

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## 12. メール通知

Resend SDKを使用。`src/lib/email/resend.ts` で実装（テンプレートは共通ヘルパーに集約）。

| 関数 | トリガー | 受信者 |
|-----|---------|-------|
| `sendOrderConfirmationEmail` | 注文確定時（Webhook受信後） | 顧客 |
| `sendShippingNotificationEmail` | 発送登録時（`/admin/orders/[id]/ship`） | 顧客 |
| `sendPaymentConfirmationEmail` | 決済完了時（Webhook） | 顧客 |

送信元は `EMAIL_FROM` 駆動（ハードコードなし）。メール本文は locale（`ja` / `zh-tw` / `en`）に応じて言語を切り替える。

---

## 13. テスト

### テスト構成

```
src/
├── lib/
│   ├── __tests__/env.test.ts
│   ├── api/__tests__/{order-guards,price-calc,orders-csv}.test.ts
│   ├── shipping/__tests__/                # 送料・配送日計算
│   ├── security/__tests__/{rate-limit,csrf}.test.ts
│   ├── validation/__tests__/schemas.test.ts
│   ├── logging/__tests__/{secure-logger,audit-log}.test.ts
│   └── utils/__tests__/format.test.ts
├── contexts/__tests__/CartContext.test.tsx
├── hooks/__tests__/{usePostalCodeLookup,useFetch}.test.ts
└── app/api/
    ├── orders/__tests__/shipping.test.ts
    ├── webhooks/__tests__/stripe.test.ts
    ├── auth/__tests__/
    ├── postal-code/lookup/__tests__/
    ├── mypage/{orders,addresses}/(...)/__tests__/
    └── admin/{orders,products,news}/(...)/__tests__/
```

> テストファイル数: 33 / テスト件数: 372（CI（`.github/workflows/ci.yml`）で実行・検証）。

### テスト方針

- DB は **モック使用**（`vi.mock`）。実DBには接続しない。
- Stripe SDK もモック使用。
- セキュリティ系（レート制限・CSRF・セキュアログ・監査ログ）はロジックのユニットテストを重視。
- API Routes テストは実際のリクエスト/レスポンス形式を検証。
- CI で `lint` / `tsc --noEmit` / `vitest run` / `npm audit` / `build` を実行。

---

## 14. デプロイ・インフラ

### ホスティング（Netlify）

- 本番は **Netlify**（`@netlify/plugin-nextjs`）。環境変数は Netlify の管理画面で設定する。
- env 変更後は **Clear cache & deploy**（手動再デプロイ）が必要。

### Supabase（dev / prod 分離）

- 本番と開発で別プロジェクトを使用する運用。接続情報は環境変数で切り替える。
- **RLS**: `00011` 等で設定。Service Role を使う API では WHERE 句が認可ゲート。
- **Storage**: 商品画像用バケット（`00002`）。
- **Auth**: メール/パスワード認証（顧客・管理者）。漏洩パスワード保護・最小長8。

### Stripe

- **環境**: `STRIPE_SECRET_KEY` のプレフィックスで `test` / `live` を判定。
- **Webhook**: 本番デプロイ後にStripeダッシュボードでWebhook URL（`/api/webhooks/stripe`）を登録（events: `checkout.session.completed` / `checkout.session.expired`）。
- **APIバージョン**: `2025-12-15.clover`。

### CI（.github/workflows/ci.yml）

- `quality`（lint / typecheck / test）、`security-audit`（`npm audit --production --audit-level=high`）、`build` の3ジョブ。
- main への push と main 向け PR で起動。

### セキュリティ注意事項

- `SUPABASE_SERVICE_ROLE_KEY` / `STRIPE_SECRET_KEY` は絶対に公開しない。
- `.env.local` は `.gitignore` に含まれていることを確認。
</content>
</invoke>
