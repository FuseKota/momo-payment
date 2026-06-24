# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

momo-payment は「もも娘」のオンライン注文システム。冷凍食品・グッズを配送するECを提供する。

### 主な機能
- **配送EC（SHIPPING）**: 冷凍食品・グッズをオンライン決済（Stripe必須）で配送
- **ニュース**: お知らせ一覧・詳細
- **マイページ**: 注文履歴・配送先住所管理
- **多言語対応**: 日本語・繁体字中文・英語（next-intl）

### 技術スタック
- Next.js 15 (App Router)
- TypeScript
- MUI (Material UI v7)
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Stripe SDK v20 (決済)
- Resend (メール通知)
- next-intl v4.13 (i18n / ja・zh-tw・en)
- google-auth-library (Google Calendar連携 / 台湾夜市)
- react-markdown (ニュース本文Markdown)
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

next-intl v4.13 を使用。

- サポートロケール：`ja`（日本語）、`zh-tw`（繁体字中文）、`en`（英語）
- デフォルトロケール：`ja`
- `localePrefix: 'as-needed'` → デフォルト(`ja`)はプレフィックスなし、`zh-tw`/`en` は `/zh-tw/...` `/en/...`
- メッセージファイル：`messages/ja.json`、`messages/zh-tw.json`、`messages/en.json`
- ルーティング設定：`src/i18n/routing.ts`
- ページ内での使用：`useTranslations('namespace')` フック

### フォント戦略

ロケールに応じて `src/app/[locale]/layout.tsx` で動的切り替え:
- `ja` → Noto Sans JP / Noto Serif JP
- `zh-tw` → Noto Sans TC / Noto Serif TC
- `en` → ラテン系（共通）

### ルート構成

```
src/app/
├── [locale]/                       # ロケールプレフィックス付きルート
│   ├── page.tsx                    # トップページ（Hero）
│   ├── layout.tsx                  # ロケール別レイアウト（フォント切替）
│   ├── shop/                       # 配送EC商品一覧（フィルタ機能）
│   │   └── [slug]/                 # 商品詳細
│   ├── cart/                       # カート（温度帯混在チェック）
│   ├── checkout/
│   │   └── shipping/               # 配送チェックアウト（住所入力）
│   ├── complete/                   # 注文完了
│   ├── login/                      # ユーザーログイン
│   ├── mypage/                     # マイページ
│   │   ├── page.tsx                # 注文履歴
│   │   ├── addresses/              # 配送先住所管理
│   │   └── orders/[id]/            # 注文詳細
│   ├── news/                       # ニュース一覧
│   │   └── [slug]/                 # ニュース詳細
│   ├── contact/                    # お問い合わせ
│   ├── taiwan-night-market/        # 台湾夜市特設ページ
│   └── legal/
│       ├── tokushoho/              # 特定商取引法表記
│       └── privacy/                # プライバシーポリシー
├── admin/                          # 管理画面（ロケール不要）
│   ├── login/                      # 管理者ログイン
│   ├── dashboard/                  # 売上ダッシュボード
│   ├── products/                   # 商品管理（CRUD・在庫・並び替え）
│   ├── news/                       # ニュース管理
│   ├── audit-logs/                 # 監査ログ閲覧
│   ├── iitate-calendar/            # 台湾夜市カレンダー管理
│   └── orders/
│       ├── page.tsx                # 注文一覧（絞り込み・CSV）
│       └── [id]/                   # 注文詳細・管理
└── api/
    ├── products/                   # GET: 商品一覧
    ├── news/                       # GET: ニュース一覧（公開）
    ├── auth/signup/                # POST: ユーザー登録
    ├── postal-code/lookup/         # GET: 郵便番号検索
    ├── health/                     # GET: ヘルスチェック
    ├── iitate-calendar/            # GET: 台湾夜市カレンダー（公開）
    ├── orders/
    │   ├── shipping/               # POST: 配送注文作成
    │   └── by-no/[orderNo]/        # GET: 注文番号検索
    ├── mypage/
    │   ├── orders/                 # GET: ユーザー注文一覧
    │   │   └── [id]/               # GET: 注文詳細
    │   └── addresses/              # CRUD: 配送先住所管理
    ├── webhooks/stripe/            # POST: Stripe Webhook
    └── admin/
        ├── products/               # CRUD: 商品管理
        │   └── reorder/            # POST: 並び替え
        ├── news/                   # CRUD: ニュース管理
        ├── upload/                 # POST: 画像アップロード
        ├── dashboard/              # GET: 売上集計
        ├── audit-logs/             # GET: 監査ログ
        ├── iitate-calendar/        # CRUD: カレンダー（events/month-notes）
        └── orders/
            ├── route.ts            # GET: 注文一覧
            ├── export/             # GET: 注文CSV
            └── [id]/
                ├── route.ts        # GET: 注文詳細
                ├── ship/           # POST: 発送登録
                ├── refund/         # POST: 全額返金（Stripe）
                └── resend-email/   # POST: メール再送
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
├── shipping/
│   ├── zones.ts                # 都道府県→地帯・運賃・お届け日数
│   ├── calc.ts                 # 送料・最短お届け日の計算（純関数）
│   └── time-slots.ts           # 配送時間帯定義
├── security/
│   ├── rate-limit.ts           # 永続レート制限（Supabase RPC）
│   └── csrf.ts                 # CSRF保護（Origin検証）
├── validation/
│   └── schemas.ts              # Zodスキーマ（入力検証）
├── logging/
│   ├── secure-logger.ts        # セキュアログ（PII自動マスク）
│   └── audit-log.ts            # 監査ログ記録
├── storage/
│   └── upload.ts               # 画像アップロード（Supabase Storage）
├── utils/
│   ├── constants.ts            # 定数
│   ├── format.ts               # 日付・金額フォーマット
│   ├── form-validators.ts      # フォームバリデーション
│   └── localize-product.ts     # 商品データのi18nローカライズ
├── seo/
│   └── structured-data.ts      # JSON-LD構造化データ
├── calendar/                   # Google Calendar連携（台湾夜市）
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
iitate_calendar_events / iitate_calendar_month_notes ── (台湾夜市カレンダー)
audit_logs / rate_limit_buckets ── (監査ログ / 永続レート制限)
```

### ステータスフロー

**配送（Stripe決済）**: `PENDING_PAYMENT` → `PAID` → `PACKING` → `SHIPPED` → `FULFILLED`
（キャンセル時は `CANCELED`、返金時は `REFUNDED`）

### 重要な制約
- **配送EC専用**: 全注文が SHIPPING（Stripeオンライン決済）。店頭受け取り（PICKUP）/店頭払いは廃止済み
- **温度帯混在禁止**: 冷凍食品（FROZEN）とグッズ（AMBIENT）の同時購入は不可

## Key Files

| ファイル | 説明 |
|---------|------|
| `docs/REQUIREMENTS.md` | 要件定義書（API仕様、画面遷移図、DBスキーマ等） |
| `src/types/database.ts` | 全てのDBモデルの型定義 |
| `src/lib/env.ts` | 環境変数のZod検証 |
| `src/lib/supabase/admin.ts` | Supabase service_roleクライアント |
| `src/lib/stripe/client.ts` | Stripe SDK設定 |
| `src/lib/stripe/webhook.ts` | Stripe Webhook署名検証 |
| `src/lib/security/rate-limit.ts` | 永続レート制限（Supabase RPC `check_rate_limit`） |
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

# Email（本番では必須 / env.ts の superRefine で検証）
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@example.com
ADMIN_EMAIL=admin@example.com

# Google Calendar（台湾夜市カレンダー。本番では必須）
GOOGLE_CALENDAR_CLIENT_EMAIL=service-account@xxx.iam.gserviceaccount.com
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=xxxxxxxx@group.calendar.google.com
GOOGLE_CALENDAR_TIMEZONE=Asia/Tokyo   # 省略時 Asia/Tokyo

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
# 送料は src/lib/shipping/zones.ts の運賃表で定義（旧 SHIPPING_FEE_YEN は廃止）
```

## Security Features

| 機能 | ファイル | 説明 |
|-----|---------|------|
| 環境変数検証 | `src/lib/env.ts` | 起動時にZodで検証 |
| 入力バリデーション | `src/lib/validation/schemas.ts` | 日本の電話番号・郵便番号対応 |
| レート制限 | `src/lib/security/rate-limit.ts` | 永続（Supabase RPC）。注文10/Webhook100/管理30/認証5 req/min/IP |
| CSRF保護 | `src/lib/security/csrf.ts` | Origin/Referer検証 |
| セキュリティヘッダー | `next.config.ts` | X-Frame-Options, CSP等 |
| セキュアログ | `src/lib/logging/secure-logger.ts` | メール・電話番号を自動マスク |
| Webhook署名検証 | `src/lib/stripe/webhook.ts` | Stripe署名検証 |

## Testing

```bash
npx vitest run                          # 全テスト実行（372件）
npx vitest run src/path/to/test.ts      # 単一ファイル実行
npx vitest                              # ウォッチモード
npx vitest run --coverage               # カバレッジ
```

### テストファイル構成（33ファイル / 372件）※主要分

```
src/
├── lib/
│   ├── __tests__/env.test.ts
│   ├── api/__tests__/{order-guards,price-calc,orders-csv}.test.ts
│   ├── shipping/__tests__/                      # 送料・配送日計算
│   ├── security/__tests__/{rate-limit,csrf}.test.ts
│   ├── validation/__tests__/schemas.test.ts
│   ├── logging/__tests__/{secure-logger,audit-log}.test.ts
│   └── utils/__tests__/format.test.ts
├── contexts/__tests__/CartContext.test.tsx
├── hooks/__tests__/{usePostalCodeLookup,useFetch}.test.ts
└── app/api/
    ├── orders/__tests__/shipping.test.ts
    ├── auth/__tests__/ ・ postal-code/lookup/__tests__/
    ├── mypage/{orders,addresses}/(...)/__tests__/
    ├── admin/{orders,products,news}/(...)/__tests__/
    └── webhooks/__tests__/stripe.test.ts
```

### Stripe テストカード
- 成功: `4242 4242 4242 4242`
- 拒否: `4000 0000 0000 9995`
- 3DS必須: `4000 0027 6000 3184`
