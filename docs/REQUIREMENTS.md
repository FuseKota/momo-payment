# momo-payment 要件定義書 v1.0 (MVP)

## 目次

1. [概要](#概要)
2. [購入体験](#購入体験)
3. [重要ルール](#重要ルール)
4. [ステータス定義](#ステータス定義)
5. [画面遷移図](#画面遷移図)
6. [API仕様](#api仕様)
7. [DBスキーマ](#dbスキーマ)
8. [Square Webhook実装](#square-webhook実装)
9. [実装マイルストーン](#実装マイルストーン)

---

## 概要

「もも娘」のオンライン注文システム。店頭受け取りと配送ECの2つの購入体験を提供する。

### 技術スタック

- Next.js 15+ (App Router)
- TypeScript
- MUI (Material UI)
- Supabase (PostgreSQL + Auth)
- Square (決済)
- Resend (メール通知)

---

## 購入体験

### A. 店頭受け取り（PICKUP）

- **支払い**: Square事前決済 / 店頭払い を選べる
- **受取日**: 必須にしない

### B. 配送EC（SHIPPING）

- **対象**: 冷凍の魯肉飯＋もも娘グッズ
- **支払い**: オンライン決済必須（Square）
- **配送**: 送料は一律（仮: ¥1,200）
- **発送管理**: 管理画面で発送ステータス/追跡番号を扱う

---

## 重要ルール

### 温度帯（冷凍）を前提にする

- 冷凍配送はキャリアの冷凍便（ヤマト -15℃以下、佐川 -18℃以下）を使用
- 冷凍便は追加料金が発生（MVPでは事業側で吸収）

### カート混在制限（MVP割り切り）

- **冷凍食品（FROZEN）とグッズ（AMBIENT）の同時購入は不可**
- 別注文にする運用

---

## ステータス定義

| ステータス | 説明 |
|-----------|------|
| `RESERVED` | 店頭払い受付 |
| `PENDING_PAYMENT` | Square決済待ち |
| `PAID` | 入金済 |
| `PACKING` | 発送準備 |
| `SHIPPED` | 発送済 |
| `FULFILLED` | 完了 |
| `CANCELED` | キャンセル |
| `REFUNDED` | 返金済 |

### 業務フロー

#### 店頭受け取り（店頭払い）
```
注文作成 → RESERVED → [管理画面で入金確認] → PAID → 受け渡し → FULFILLED
```

#### 店頭受け取り（Square事前決済）
```
注文作成 → PENDING_PAYMENT → Square決済 → [Webhook] → PAID → 受け渡し → FULFILLED
```

#### 配送EC
```
注文作成 → PENDING_PAYMENT → Square決済 → [Webhook] → PAID → PACKING → SHIPPED → FULFILLED
```

---

## 画面遷移図

```
┌─────────────────────────────────────────────────────────────────────┐
│                              トップ (/)                              │
│                     [店頭受け取り]  [配送注文]                        │
└───────────┬─────────────────────────────────┬───────────────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│  店頭受け取り /pickup  │         │   配送EC /shop        │
│  - 商品選択            │         │  - カテゴリ選択       │
│  - 顧客情報入力        │         │    (冷凍食品/グッズ)  │
└───────────┬───────────┘         └───────────┬───────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│ 決済選択               │         │ 商品詳細 /shop/[slug] │
│ /checkout/pickup       │         │  - 食品表示情報       │
│  [店頭払い] [Square]   │         │  - カートに追加       │
└─────┬─────────┬───────┘         └───────────┬───────────┘
      │         │                             │
      │         ▼                             ▼
      │  ┌──────────────┐         ┌───────────────────────┐
      │  │Square決済    │         │ カート /cart          │
      │  │(外部ページ)  │         │  ※温度帯混在不可     │
      │  └──────┬───────┘         └───────────┬───────────┘
      │         │                             │
      ▼         ▼                             ▼
┌───────────────────────┐         ┌───────────────────────┐
│ 完了 /complete         │         │ 配送チェックアウト    │
│  - 注文番号表示        │◄────────│ /checkout/shipping    │
│  - 注意事項            │         │  - 住所入力           │
└───────────────────────┘         │  - Square決済         │
                                  └───────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          管理画面                                    │
├─────────────────────────────────────────────────────────────────────┤
│ /admin/login      → Supabase Auth                                   │
│ /admin/products   → 商品管理（冷凍/グッズ区分、公開、在庫）          │
│ /admin/orders     → 注文一覧                                        │
│ /admin/orders/[id]→ 注文詳細（入金/発送/追跡/受け渡し）             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          法定ページ                                  │
├─────────────────────────────────────────────────────────────────────┤
│ /legal/tokushoho  → 特定商取引法に基づく表記                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API仕様

### 共通レスポンス形式

```typescript
// 成功
{ "ok": true, "data": { ... } }

// エラー
{ "ok": false, "error": "error_code", "message": "詳細メッセージ" }
```

### POST /api/orders/pickup

店頭受け取り注文を作成する。

#### Request

```json
{
  "customer": {
    "name": "山田 太郎",
    "phone": "09012345678",
    "email": "taro@example.com"
  },
  "items": [
    { "productId": "uuid-1", "qty": 2 },
    { "productId": "uuid-2", "qty": 1 }
  ],
  "paymentMethod": "PAY_AT_PICKUP",
  "agreementAccepted": true
}
```

#### Response（店頭払い）

```json
{
  "ok": true,
  "data": {
    "orderId": "uuid-order",
    "orderNo": "20260105-abcdef123456",
    "status": "RESERVED",
    "paymentMethod": "PAY_AT_PICKUP",
    "totalYen": 1800
  }
}
```

#### Response（Square決済）

```json
{
  "ok": true,
  "data": {
    "orderId": "uuid-order",
    "orderNo": "20260105-abcdef123456",
    "status": "PENDING_PAYMENT",
    "paymentMethod": "SQUARE",
    "totalYen": 1800,
    "checkoutUrl": "https://square.link/u/xxxxxx"
  }
}
```

---

### POST /api/orders/shipping

配送注文を作成する（Squareオンライン決済必須）。

#### Request

```json
{
  "customer": {
    "name": "山田 太郎",
    "phone": "09012345678",
    "email": "taro@example.com"
  },
  "address": {
    "postalCode": "1600022",
    "pref": "東京都",
    "city": "新宿区",
    "address1": "新宿1-2-3",
    "address2": "ハイツ101"
  },
  "items": [
    { "productId": "uuid-frozen-rurohan", "qty": 3 }
  ],
  "agreementAccepted": true
}
```

#### Response

```json
{
  "ok": true,
  "data": {
    "orderId": "uuid-order",
    "orderNo": "20260105-abcdef123456",
    "orderType": "SHIPPING",
    "status": "PENDING_PAYMENT",
    "tempZone": "FROZEN",
    "subtotalYen": 3600,
    "shippingFeeYen": 1200,
    "totalYen": 4800,
    "checkoutUrl": "https://square.link/u/yyyyyy"
  }
}
```

---

### POST /api/webhooks/square

Square Webhookを受信し、支払い完了を処理する。

#### Headers

- `x-square-hmacsha256-signature`: HMAC署名（必須）

#### 処理フロー

1. 署名検証（HMAC-SHA256）
2. `event_id` で冪等性チェック
3. `payment.updated` イベントで `status=COMPLETED` の場合、注文を `PAID` に更新

#### Response

- 成功: `200 OK`
- 署名NG: `403 Forbidden`

---

### POST /api/admin/orders/{orderId}/mark-paid

管理者が店頭入金を確認する。

#### Request

```json
{
  "note": "現金で入金確認"
}
```

#### Response

```json
{
  "ok": true,
  "data": {
    "orderId": "uuid-order",
    "status": "PAID"
  }
}
```

---

### POST /api/admin/orders/{orderId}/ship

発送情報を登録する。

#### Request

```json
{
  "carrier": "yamato",
  "trackingNo": "1234-5678-9012"
}
```

#### Response

```json
{
  "ok": true,
  "data": {
    "orderId": "uuid-order",
    "status": "SHIPPED"
  }
}
```

---

## DBスキーマ

詳細は `supabase/migrations/00001_initial_schema.sql` を参照。

### テーブル一覧

| テーブル | 説明 |
|---------|------|
| `admin_users` | 管理者ユーザー（Supabase Auth連携） |
| `products` | 商品マスタ |
| `orders` | 注文 |
| `order_items` | 注文明細（スナップショット保持） |
| `shipping_addresses` | 配送先住所 |
| `shipments` | 発送情報 |
| `payments` | 決済情報 |
| `square_webhook_events` | Webhook冪等性管理 |

### ER図

```
admin_users
    │
    │ (Auth連携)
    ▼
products ──┬── order_items ─── orders ──┬── payments
           │                            ├── shipping_addresses
           │                            ├── shipments
           │                            └── square_webhook_events
           │
           └── food_label (JSONB)
```

### 主要な制約

1. **orders_total_consistency**: `total_yen = subtotal_yen + shipping_fee_yen`
2. **orders_shipping_rules**: 配送注文は `SQUARE` 決済必須 + `temp_zone` 必須
3. **order_items_line_total**: `line_total_yen = unit_price_yen * qty`

---

## Square Webhook実装

### 環境変数

```env
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=...
SQUARE_LOCATION_ID=...
SQUARE_WEBHOOK_SIGNATURE_KEY=...
SQUARE_WEBHOOK_NOTIFICATION_URL=https://your-domain.example/api/webhooks/square
```

### 署名検証

```typescript
// lib/square/webhook.ts
import crypto from 'crypto';

export function verifySquareWebhookSignature(params: {
  signatureHeader: string | null;
  rawBody: string;
  signatureKey: string;
  notificationUrl: string;
}): boolean {
  if (!params.signatureHeader) return false;

  const payload = params.notificationUrl + params.rawBody;
  const expectedSignature = crypto
    .createHmac('sha256', params.signatureKey)
    .update(payload)
    .digest('base64');

  return params.signatureHeader === expectedSignature;
}
```

### Webhook処理フロー

```
1. Request受信
   ↓
2. 署名検証 (x-square-hmacsha256-signature)
   ↓ (失敗: 403)
3. event_id で冪等性チェック (square_webhook_events)
   ↓ (重複: 200 OK で終了)
4. event_type が "payment.updated" かチェック
   ↓ (それ以外: 200 OK で終了)
5. payment.status が "COMPLETED" かチェック
   ↓ (それ以外: 200 OK で終了)
6. payments テーブル更新 (status=SUCCEEDED)
   ↓
7. orders テーブル更新 (status=PAID)
   ↓
8. 200 OK
```

---

## 実装マイルストーン

### Phase 1: 基盤構築 ✅

- [x] Next.js プロジェクトセットアップ
- [x] TypeScript 設定
- [x] Tailwind CSS 設定
- [ ] MUI インストール・設定
- [x] Supabase クライアント設定
- [x] Square クライアント設定
- [x] フォルダ構成作成

### Phase 2: DB・認証

- [ ] Supabase スキーマ作成（確定版マイグレーション）
- [ ] 管理者 Auth 設定
- [ ] RLS ポリシー設定

### Phase 3: 商品管理

- [ ] 商品一覧API
- [ ] 商品詳細API
- [ ] 管理画面：商品CRUD

### Phase 4: 店頭受け取り

- [ ] 店頭受け取り注文API（店頭払い）
- [ ] 店頭受け取り注文API（Square決済）
- [ ] 注文フォームUI

### Phase 5: Square決済

- [ ] Payment Link生成
- [ ] Webhook署名検証
- [ ] 支払い確定処理

### Phase 6: 配送EC

- [ ] 配送注文API
- [ ] 住所入力フォーム
- [ ] 送料計算

### Phase 7: 発送管理

- [ ] 発送ステータス更新API
- [ ] 追跡番号登録
- [ ] 管理画面：発送操作

### Phase 8: メール通知

- [ ] 注文受付メール
- [ ] 入金完了メール
- [ ] 発送完了メール

### Phase 9: 法定ページ

- [ ] 特定商取引法ページ
- [ ] 食品表示情報
