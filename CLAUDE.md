# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

momo-payment は「もも娘」のオンライン注文システム。店頭受け取りと配送ECの2つの購入体験を提供する。

### 主な機能
- **店頭受け取り（PICKUP）**: Square事前決済 or 店頭払いを選択可能
- **配送EC（SHIPPING）**: 冷凍食品・グッズをオンライン決済（Square必須）で配送

### 技術スタック
- Next.js 16 (App Router)
- TypeScript
- MUI (Material UI v7)
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Square SDK v43 (決済)
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
    ├── webhooks/square/        # POST: Square Webhook
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
           └── food_label (JSONB)       └── square_webhook_events
```

### ステータスフロー

**店頭払い**: `RESERVED` → `PAID` → `FULFILLED`
**Square決済（店頭受取）**: `PENDING_PAYMENT` → `PAID` → `FULFILLED`
**Square決済（配送）**: `PENDING_PAYMENT` → `PAID` → `PACKING` → `SHIPPED` → `FULFILLED`

### 重要な制約
- **温度帯混在禁止**: 冷凍食品（FROZEN）とグッズ（AMBIENT）の同時購入は不可
- **配送はオンライン決済必須**: SHIPPING注文はSquare決済のみ

## Key Files

| ファイル | 説明 |
|---------|------|
| `docs/REQUIREMENTS.md` | 要件定義書（API仕様、画面遷移図、DBスキーマ等） |
| `src/types/database.ts` | 全てのDBモデルの型定義 |
| `src/lib/supabase/admin.ts` | Supabase service_roleクライアント（API用） |
| `src/lib/supabase/server.ts` | Supabase SSRクライアント |
| `src/lib/supabase/client.ts` | Supabase ブラウザクライアント |
| `src/lib/square/client.ts` | Square SDK設定 |
| `src/lib/square/webhook.ts` | Square Webhook署名検証 |
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

# Square
SQUARE_ENVIRONMENT=sandbox  # or production
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_WEBHOOK_NOTIFICATION_URL=

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
- [x] Squareクライアント設定
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
- [x] POST /api/webhooks/square（Webhook署名検証）
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

## Square SDK v43 Usage

Square SDK v43ではAPIが変更されています:

```typescript
// クライアント初期化
import { SquareClient, SquareEnvironment } from 'square';

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: SquareEnvironment.Sandbox,
});

// Payment Link作成（checkout.paymentLinks.create）
// ※ レスポンスは直接 paymentLink プロパティを持つ（result でラップされない）
const response = await squareClient.checkout.paymentLinks.create({
  idempotencyKey,
  order: {
    locationId,
    lineItems: [{
      name: '商品名',
      quantity: '1',
      basePriceMoney: {
        amount: BigInt(1000),
        currency: 'JPY' as const,  // Currency型として指定
      },
    }],
  },
  checkoutOptions: { redirectUrl },
});
const checkoutUrl = response.paymentLink?.url;

// Payment取得
const paymentResponse = await squareClient.payments.get({ paymentId });
const payment = paymentResponse.payment;
```
