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
- Stripe SDK (決済)
- Resend (メール通知)

## Build and Development Commands

```bash
npm run dev      # 開発サーバー起動 (http://localhost:3000)
npm run build    # 本番ビルド
npm run start    # 本番サーバー起動
npm run lint     # ESLint実行
```

## Architecture

### ルート構成

```
src/app/
├── page.tsx                    # トップページ
├── pickup/                     # 店頭受け取り注文
├── shop/                       # 配送ECトップ
│   └── [slug]/                 # 商品詳細
├── cart/                       # カート
├── checkout/
│   ├── pickup/                 # 店頭受け取り決済選択
│   └── shipping/               # 配送チェックアウト
├── complete/                   # 注文完了
├── legal/tokushoho/            # 特定商取引法表記
├── admin/
│   ├── login/                  # 管理者ログイン
│   ├── products/               # 商品管理
│   └── orders/[id]/            # 注文管理
└── api/
    ├── orders/
    │   ├── pickup/             # POST: 店頭受け取り注文作成
    │   └── shipping/           # POST: 配送注文作成
    ├── webhooks/stripe/        # POST: Stripe Webhook
    └── admin/orders/[id]/
        ├── mark-paid/          # POST: 入金確認
        └── ship/               # POST: 発送登録
```

### データモデル

```
admin_users ─── (Supabase Auth)
products ──┬── order_items ─── orders ──┬── payments
           │                            ├── shipping_addresses
           │                            ├── shipments
           └── food_label (JSONB)       └── stripe_webhook_events
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
| `src/lib/supabase/admin.ts` | Supabase service_roleクライアント（API用） |
| `src/lib/supabase/server.ts` | Supabase SSRクライアント |
| `src/lib/supabase/client.ts` | Supabase ブラウザクライアント |
| `src/lib/stripe/client.ts` | Stripe SDK設定 |
| `src/lib/stripe/webhook.ts` | Stripe Webhook署名検証 |
| `src/lib/mui/theme.ts` | MUIテーマ設定 |
| `src/lib/mui/ThemeRegistry.tsx` | MUI App Router統合 |
| `supabase/migrations/` | DBスキーマ（確定版） |

## Environment Variables

`.env.example`を`.env.local`にコピーして設定:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
RESEND_API_KEY=
EMAIL_FROM=
ADMIN_EMAIL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
SHIPPING_FEE_YEN=1200
```

## Implementation Progress

### Phase 1: 基盤構築 ✅
- [x] Next.js プロジェクトセットアップ
- [x] TypeScript設定
- [x] Tailwind CSS設定
- [x] MUI (Material UI) インストール・設定
- [x] Supabaseクライアント設定
- [x] Stripeクライアント設定
- [x] フォルダ構成作成
- [x] 型定義ファイル作成
- [x] 要件定義ドキュメント作成

### Phase 2: DB・認証
- [x] Supabase スキーマ作成（確定版マイグレーション）
- [ ] Supabaseプロジェクト作成・マイグレーション実行
- [ ] 管理者 Auth設定
- [ ] RLSポリシー動作確認

### Phase 3: API実装 ✅
- [x] POST /api/orders/pickup（店頭受け取り注文）
- [x] POST /api/orders/shipping（配送注文）
- [x] POST /api/webhooks/stripe（Webhook署名検証）
- [x] POST /api/admin/orders/[id]/mark-paid（入金確認）
- [x] POST /api/admin/orders/[id]/ship（発送登録）

### Phase 4: UI実装
- [ ] トップページ
- [ ] 店頭受け取りフォーム
- [ ] 配送EC（商品一覧・詳細）
- [ ] カート
- [ ] チェックアウト
- [ ] 注文完了ページ
- [ ] 管理画面

### Phase 5: 追加機能
- [ ] メール通知
- [ ] 特定商取引法ページ
- [ ] 食品表示情報

## Stripe SDK Usage

Stripe Checkout Sessionを使った決済フロー:

```typescript
// クライアント初期化
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

// Checkout Session作成
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'jpy',
      product_data: { name: '商品名' },
      unit_amount: 1000,  // JPYは整数（センチレスカレンシー）
    },
    quantity: 1,
  }],
  success_url: `${APP_URL}/complete?orderNo=${orderNo}`,
  cancel_url: `${APP_URL}/checkout?canceled=true`,
  metadata: { order_no: orderNo, order_id: orderId },
  locale: 'ja',
}, {
  idempotencyKey,  // 冪等性確保
});

const checkoutUrl = session.url;
const sessionId = session.id;  // Webhook処理時の照合に使用
```

### Webhook署名検証

```typescript
import { stripe } from '@/lib/stripe/client';

const event = stripe.webhooks.constructEvent(
  rawBody,
  request.headers.get('stripe-signature')!,
  process.env.STRIPE_WEBHOOK_SECRET!
);

// checkout.session.completed イベントで決済完了を検知
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  // session.id で payments テーブルと照合
}
```

### ローカル開発時のWebhookテスト

```bash
# Stripe CLIでWebhookをローカルに転送
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### テストカード
- 成功: `4242 4242 4242 4242`
- 拒否: `4000 0000 0000 9995`
