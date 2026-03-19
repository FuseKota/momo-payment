# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

momo-payment は「もも娘」のオンライン注文システム。店頭受け取りと配送ECの2つの購入体験を提供する。

### 主な機能
- **店頭受け取り（PICKUP）**: Stripe事前決済 or 店頭払いを選択可能
- **配送EC（SHIPPING）**: 冷凍食品・グッズをオンライン決済（Stripe必須）で配送
- **ニュース**: お知らせ一覧・詳細
- **マイページ**: 注文履歴・配送先住所管理
- **多言語対応**: 日本語・繁体字中文（next-intl）

### 技術スタック
- Next.js 16 (App Router)
- TypeScript
- MUI (Material UI v7)
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Stripe SDK v20 (決済)
- Resend (メール通知)
- next-intl v4.8.3 (i18n)
- Vitest (テスト)

## Build and Development Commands

```bash
npm run dev      # 開発サーバー起動 (http://localhost:3000)
npm run build    # 本番ビルド
npm run start    # 本番サーバー起動
npm run lint     # ESLint実行
npm run seed     # DBシードデータ投入
npm run create-admin  # 管理者アカウント作成

# テスト
npx vitest run                          # 全テスト実行
npx vitest run src/path/to/test.ts      # 単一ファイル実行
npx vitest                              # ウォッチモード
npx vitest run --coverage               # カバレッジ

# Stripeローカルテスト
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Architecture

### 国際化（i18n）

next-intl v4.8.3 を使用。全URLにロケールプレフィックスが付く。

- サポートロケール：`ja`（日本語）、`zh-tw`（繁体字中文）
- デフォルトロケール：`ja`
- `localePrefix: 'always'` → 全URLが `/ja/...` or `/zh-tw/...`
- メッセージファイル：`messages/ja.json`、`messages/zh-tw.json`
- ルーティング設定：`src/i18n/routing.ts`
- ページ内での使用：`useTranslations('namespace')` フック

### フォント戦略

ロケールに応じて `src/app/[locale]/layout.tsx` で動的切り替え:
- `ja` → Noto Sans JP / Noto Serif JP
- `zh-tw` → Noto Sans TC / Noto Serif TC

### ルート構成

```
src/app/
├── [locale]/                       # ロケールプレフィックス付きルート
│   ├── page.tsx                    # トップページ（Hero + 購入方法選択）
│   ├── layout.tsx                  # ロケール別レイアウト（フォント切替）
│   ├── pickup/                     # 店頭受け取り注文フォーム
│   ├── shop/                       # 配送EC商品一覧（フィルタ機能）
│   │   └── [slug]/                 # 商品詳細
│   ├── cart/                       # カート（温度帯混在チェック）
│   ├── checkout/
│   │   ├── pickup/                 # 店頭受け取り決済選択
│   │   └── shipping/               # 配送チェックアウト（住所入力）
│   ├── complete/                   # 注文完了
│   ├── login/                      # ユーザーログイン
│   ├── mypage/                     # マイページ
│   │   ├── page.tsx                # 注文履歴
│   │   ├── addresses/              # 配送先住所管理
│   │   └── orders/[id]/            # 注文詳細
│   ├── news/                       # ニュース一覧
│   │   └── [slug]/                 # ニュース詳細
│   ├── taiwan-night-market/        # 台湾夜市特設ページ
│   └── legal/
│       ├── tokushoho/              # 特定商取引法表記
│       └── privacy/                # プライバシーポリシー
├── admin/                          # 管理画面（ロケール不要）
│   ├── login/                      # 管理者ログイン
│   ├── products/                   # 商品管理（CRUD）
│   ├── news/                       # ニュース管理
│   └── orders/
│       ├── page.tsx                # 注文一覧
│       └── [id]/                   # 注文詳細・管理
└── api/
    ├── products/                   # GET: 商品一覧
    ├── news/                       # GET: ニュース一覧（公開）
    ├── auth/signup/                # POST: ユーザー登録
    ├── postal-code/lookup/         # GET: 郵便番号検索
    ├── orders/
    │   ├── pickup/                 # POST: 店頭受け取り注文作成
    │   ├── shipping/               # POST: 配送注文作成
    │   └── by-no/[orderNo]/        # GET: 注文番号検索
    ├── mypage/
    │   ├── orders/                 # GET: ユーザー注文一覧
    │   │   └── [id]/               # GET: 注文詳細
    │   └── addresses/              # CRUD: 配送先住所管理
    ├── webhooks/stripe/            # POST: Stripe Webhook
    └── admin/
        ├── products/               # CRUD: 商品管理
        ├── news/                   # CRUD: ニュース管理
        └── orders/
            ├── route.ts            # GET: 注文一覧
            └── [id]/
                ├── route.ts        # GET: 注文詳細
                ├── mark-paid/      # POST: 入金確認
                └── ship/           # POST: 発送登録
```

### ライブラリ構成

```
src/lib/
├── env.ts                      # 環境変数検証（Zod）
├── api/
│   ├── admin-guards.ts         # 管理者API認証ガード
│   ├── order-guards.ts         # 注文アクセス制御
│   ├── price-calc.ts           # 価格計算ロジック
│   ├── product-helpers.ts      # 商品ヘルパー
│   └── localize.ts             # i18nローカライズ
├── auth/
│   ├── require-admin.ts        # 管理者認証要求
│   └── require-customer.ts     # 顧客認証要求
├── supabase/
│   ├── admin.ts                # Service Roleクライアント
│   ├── server.ts               # SSRクライアント
│   └── client.ts               # ブラウザクライアント
├── stripe/
│   ├── client.ts               # Stripe SDK初期化
│   └── webhook.ts              # Webhook署名検証
├── email/
│   └── resend.ts               # メール送信（注文確認・発送通知）
├── security/
│   ├── rate-limit.ts           # レート制限（10req/min/IP）
│   └── csrf.ts                 # CSRF保護（Origin検証）
├── validation/
│   └── schemas.ts              # Zodスキーマ（入力検証）
├── logging/
│   └── secure-logger.ts        # セキュアログ（PII自動マスク）
├── storage/
│   └── upload.ts               # 画像アップロード（Supabase Storage）
├── utils/
│   ├── constants.ts            # 定数
│   ├── format.ts               # 日付・金額フォーマット
│   ├── form-validators.ts      # フォームバリデーション
│   └── localize-product.ts     # 商品データのi18nローカライズ
└── mui/
    ├── theme.ts                # MUIテーマ
    └── ThemeRegistry.tsx       # App Router統合
```

### 認証フロー

- **顧客認証**: Supabase Auth（メール・パスワード）
  - `src/contexts/AuthContext.tsx` — 認証状態管理（React Context）
  - `src/middleware.ts` — マイページ・チェックアウトでセッションリフレッシュ
- **管理者認証**: Supabase Auth（別テーブルで管理者権限チェック）
  - `src/lib/auth/require-admin.ts` — API層での管理者確認

### データモデル

```
admin_users ─── (Supabase Auth)
products ──┬── product_variants ─── order_items ─── orders ──┬── payments
           │                                                  ├── shipping_addresses
           └── food_label (JSONB)                             ├── shipments
                                                              └── stripe_webhook_events
news ── (独立テーブル)
```

### ステータスフロー

**店頭払い**: `RESERVED` → `PAID` → `FULFILLED`
**Stripe決済（店頭受取）**: `PENDING_PAYMENT` → `PAID` → `FULFILLED`
**Stripe決済（配送）**: `PENDING_PAYMENT` → `PAID` → `PACKING` → `SHIPPED` → `FULFILLED`

### 重要な制約
- **温度帯混在禁止**: 冷凍食品（FROZEN）とグッズ（AMBIENT）の同時購入は不可
- **配送はオンライン決済必須**: SHIPPING注文はStripe決済のみ

## Key Files

| ファイル | 説明 |
|---------|------|
| `docs/REQUIREMENTS.md` | 要件定義書（API仕様、画面遷移図、DBスキーマ等） |
| `src/types/database.ts` | 全てのDBモデルの型定義 |
| `src/lib/env.ts` | 環境変数のZod検証 |
| `src/lib/supabase/admin.ts` | Supabase service_roleクライアント |
| `src/lib/stripe/client.ts` | Stripe SDK設定 |
| `src/lib/stripe/webhook.ts` | Stripe Webhook署名検証 |
| `src/lib/security/rate-limit.ts` | インメモリレート制限 |
| `src/lib/security/csrf.ts` | CSRF保護（Origin検証） |
| `src/lib/validation/schemas.ts` | 入力バリデーションスキーマ |
| `src/lib/logging/secure-logger.ts` | PIIマスク付きログ |
| `src/contexts/CartContext.tsx` | カート状態管理 |
| `src/contexts/AuthContext.tsx` | ユーザー認証状態管理 |
| `src/middleware.ts` | セキュリティヘッダー・セッションリフレッシュ |
| `src/i18n/routing.ts` | i18nルーティング設定 |
| `messages/ja.json` | 日本語翻訳メッセージ |
| `messages/zh-tw.json` | 繁体字中文翻訳メッセージ |
| `supabase/migrations/` | DBスキーママイグレーション |

## Environment Variables

`.env.example`を`.env.local`にコピーして設定:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx       # sk_で始まること
STRIPE_WEBHOOK_SECRET=whsec_xxx     # whsec_で始まること

# Email
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@example.com
ADMIN_EMAIL=admin@example.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
SHIPPING_FEE_YEN=1200
```

## Security Features

| 機能 | ファイル | 説明 |
|-----|---------|------|
| 環境変数検証 | `src/lib/env.ts` | 起動時にZodで検証 |
| 入力バリデーション | `src/lib/validation/schemas.ts` | 日本の電話番号・郵便番号対応 |
| レート制限 | `src/lib/security/rate-limit.ts` | 10req/min/IP（インメモリ） |
| CSRF保護 | `src/lib/security/csrf.ts` | Origin/Referer検証 |
| セキュリティヘッダー | `next.config.ts` | X-Frame-Options, CSP等 |
| セキュアログ | `src/lib/logging/secure-logger.ts` | メール・電話番号を自動マスク |
| Webhook署名検証 | `src/lib/stripe/webhook.ts` | Stripe署名検証 |

## Testing

```bash
npx vitest run                          # 全テスト実行（133件）
npx vitest run src/path/to/test.ts      # 単一ファイル実行
npx vitest                              # ウォッチモード
npx vitest run --coverage               # カバレッジ
```

### テストファイル構成（13ファイル）

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

### Stripe テストカード
- 成功: `4242 4242 4242 4242`
- 拒否: `4000 0000 0000 9995`
- 3DS必須: `4000 0027 6000 3184`
