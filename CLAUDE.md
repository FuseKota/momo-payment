# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

momo-payment は「もも娘」のオンライン注文システム。店頭受け取りと配送ECの2つの購入体験を提供する。

### 主な機能
- **店頭受け取り（PICKUP）**: Stripe事前決済 or 店頭払いを選択可能
- **配送EC（SHIPPING）**: 冷凍食品・グッズをオンライン決済（Stripe必須）で配送

### 技術スタック
- Next.js 16 (App Router)
- TypeScript
- MUI (Material UI v7)
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Stripe SDK v20 (決済)
- Resend (メール通知)
- Vitest (テスト)

## Build and Development Commands

```bash
npm run dev      # 開発サーバー起動 (http://localhost:3000)
npm run build    # 本番ビルド
npm run start    # 本番サーバー起動
npm run lint     # ESLint実行
npx vitest run   # テスト実行
```

## Architecture

### ルート構成

```
src/app/
├── page.tsx                    # トップページ（Hero + 購入方法選択）
├── pickup/                     # 店頭受け取り注文フォーム
├── shop/                       # 配送EC商品一覧（フィルタ機能）
│   └── [slug]/                 # 商品詳細
├── cart/                       # カート（温度帯混在チェック）
├── checkout/
│   ├── pickup/                 # 店頭受け取り決済選択
│   └── shipping/               # 配送チェックアウト（住所入力）
├── complete/                   # 注文完了
├── legal/tokushoho/            # 特定商取引法表記
├── admin/
│   ├── login/                  # 管理者ログイン
│   ├── products/               # 商品管理（CRUD）
│   └── orders/
│       ├── page.tsx            # 注文一覧
│       └── [id]/               # 注文詳細・管理
└── api/
    ├── products/               # GET: 商品一覧
    ├── orders/
    │   ├── pickup/             # POST: 店頭受け取り注文作成
    │   ├── shipping/           # POST: 配送注文作成
    │   ├── by-no/[orderNo]/    # GET: 注文番号検索
    │   └── [id]/create-payment-link/  # POST: 決済リンク作成
    ├── webhooks/stripe/        # POST: Stripe Webhook
    └── admin/
        ├── products/           # GET/POST/PUT/DELETE: 商品管理
        ├── upload/             # POST: 画像アップロード
        └── orders/
            ├── route.ts        # GET: 注文一覧
            └── [id]/
                ├── route.ts    # GET: 注文詳細
                ├── mark-paid/  # POST: 入金確認
                └── ship/       # POST: 発送登録
```

### ライブラリ構成

```
src/lib/
├── env.ts                      # 環境変数検証（Zod）
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
└── mui/
    ├── theme.ts                # MUIテーマ
    └── ThemeRegistry.tsx       # App Router統合
```

### データモデル

```
admin_users ─── (Supabase Auth)
products ──┬── product_variants ─── order_items ─── orders ──┬── payments
           │                                                  ├── shipping_addresses
           └── food_label (JSONB)                             ├── shipments
                                                              └── stripe_webhook_events
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
| `src/middleware.ts` | セキュリティヘッダー設定 |
| `supabase/migrations/` | DBスキーマ（7マイグレーション） |

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

## Implementation Progress

### Phase 1: 基盤構築 ✅
- [x] Next.js 16 + TypeScript
- [x] MUI v7 + Tailwind CSS
- [x] Supabaseクライアント設定
- [x] Stripeクライアント設定
- [x] 型定義ファイル作成
- [x] 要件定義ドキュメント

### Phase 2: DB・認証 ✅
- [x] Supabase スキーマ作成（7マイグレーション）
- [x] product_variants（サイズバリエーション）
- [x] Stripe決済対応テーブル
- [x] 管理者Auth設定

### Phase 3: API実装 ✅
- [x] POST /api/orders/pickup（店頭受け取り注文）
- [x] POST /api/orders/shipping（配送注文）
- [x] POST /api/webhooks/stripe（Webhook署名検証）
- [x] GET /api/products（商品一覧）
- [x] CRUD /api/admin/products（商品管理）
- [x] POST /api/admin/orders/[id]/mark-paid（入金確認）
- [x] POST /api/admin/orders/[id]/ship（発送登録）

### Phase 4: UI実装 ✅
- [x] トップページ（Hero + 購入方法選択）
- [x] 店頭受け取りフォーム
- [x] 配送EC（商品一覧・詳細・フィルタ）
- [x] カート（温度帯混在チェック）
- [x] チェックアウト（店頭・配送）
- [x] 注文完了ページ
- [x] 管理画面（注文一覧・詳細・商品管理）
- [x] 特定商取引法ページ

### Phase 5: セキュリティ ✅
- [x] 環境変数検証（Zod）
- [x] 入力バリデーション（電話・メール・郵便番号）
- [x] レート制限（10req/min/IP）
- [x] CSRF保護（Origin検証）
- [x] セキュリティヘッダー（X-Frame-Options等）
- [x] セキュアログ（PII自動マスク）
- [x] Webhook署名検証
- [x] ユニットテスト（68件）

### Phase 6: 追加機能 ✅
- [x] メール通知（Resend）
- [x] 注文確認メール
- [x] 発送通知メール

### 残タスク
- [ ] 本番環境デプロイ確認
- [ ] RLSポリシー動作確認
- [ ] 3Dセキュア強制設定（オプション）

## Security Features

### 実装済みセキュリティ

| 機能 | ファイル | 説明 |
|-----|---------|------|
| 環境変数検証 | `src/lib/env.ts` | 起動時にZodで検証 |
| 入力バリデーション | `src/lib/validation/schemas.ts` | 日本の電話番号・郵便番号対応 |
| レート制限 | `src/lib/security/rate-limit.ts` | 10req/min/IP（インメモリ） |
| CSRF保護 | `src/lib/security/csrf.ts` | Origin/Referer検証 |
| セキュリティヘッダー | `next.config.ts` | X-Frame-Options, CSP等 |
| セキュアログ | `src/lib/logging/secure-logger.ts` | メール・電話番号を自動マスク |
| Webhook署名検証 | `src/lib/stripe/webhook.ts` | Stripe署名検証 |

### セキュリティヘッダー

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Stripe SDK Usage

Stripe Checkout Sessionを使った決済フロー:

```typescript
import { stripe } from '@/lib/stripe/client';
import { env } from '@/lib/env';

// Checkout Session作成
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'jpy',
      product_data: { name: '商品名' },
      unit_amount: 1000,  // JPYは整数
    },
    quantity: 1,
  }],
  success_url: `${env.NEXT_PUBLIC_APP_URL}/complete?orderNo=${orderNo}`,
  cancel_url: `${env.NEXT_PUBLIC_APP_URL}/checkout?canceled=true`,
  metadata: { order_no: orderNo, order_id: orderId },
  locale: 'ja',
}, {
  idempotencyKey,  // 冪等性確保
});
```

### Webhook署名検証

```typescript
import { stripe } from '@/lib/stripe/client';

const event = stripe.webhooks.constructEvent(
  rawBody,
  request.headers.get('stripe-signature')!,
  env.STRIPE_WEBHOOK_SECRET
);

if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  // session.id で payments テーブルと照合
}
```

### ローカル開発時のWebhookテスト

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### テストカード
- 成功: `4242 4242 4242 4242`
- 拒否: `4000 0000 0000 9995`
- 3DS必須: `4000 0027 6000 3184`

## Testing

```bash
# 全テスト実行
npx vitest run

# ウォッチモード
npx vitest

# カバレッジ
npx vitest run --coverage
```

### テストファイル構成
```
src/lib/
├── __tests__/env.test.ts                    # 環境変数検証（13件）
├── security/__tests__/
│   ├── rate-limit.test.ts                   # レート制限（9件）
│   └── csrf.test.ts                         # CSRF保護（8件）
├── validation/__tests__/schemas.test.ts     # バリデーション（25件）
└── logging/__tests__/secure-logger.test.ts  # セキュアログ（13件）
```
