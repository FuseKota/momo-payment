# momo-payment 要件定義書 v2.0

**最終更新**: 2026-06-16
**ステータス**: 本番リリース版
**改訂履歴**: v1.0 (MVP, 決済=Square 想定) → **v2.0（決済を Stripe に変更、顧客アカウント・マイページ・ニュース・多言語・商品バリエーション・配送日時指定・台湾夜市カレンダーを反映）**

> **重要な変更点（v1.0 → v2.0）**: MVP 設計時は決済プロバイダに **Square** を想定していましたが、実装では **Stripe** を採用しました。本書はすべて現行実装（Stripe）に整合しています。DB 内に残る `square_webhook_events` テーブルや `payment_method` enum の `SQUARE` 値は旧仕様の名残であり、現行フローでは使用しません。

## 目次

1. [概要](#概要)
2. [購入体験](#購入体験)
3. [重要ルール](#重要ルール)
4. [ステータス定義](#ステータス定義)
5. [画面遷移図](#画面遷移図)
6. [API仕様](#api仕様)
7. [DBスキーマ](#dbスキーマ)
8. [Stripe Webhook実装](#stripe-webhook実装)
9. [追加機能（v2.0）](#追加機能v20)
10. [非機能要件](#非機能要件)

---

## 概要

「もも娘」のオンライン注文システム。店頭受け取りと配送ECの2つの購入体験を提供する。

### 技術スタック

- Next.js 15 (App Router) / TypeScript
- MUI (Material UI v7) + Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Storage)
- **Stripe (決済)** ← v1.0 の Square から変更
- Resend (メール通知)
- next-intl v4（日本語・繁体字中文）
- Vitest（テスト）

---

## 購入体験

### A. 店頭受け取り（PICKUP）

- **支払い**: Stripe 事前決済 / 店頭払い を選べる
- **受取日時**: 任意（必須にしない）

### B. 配送EC（SHIPPING）

- **対象**: 冷凍の魯肉飯＋もも娘グッズ
- **支払い**: オンライン決済必須（**Stripe**）
- **配送**: 送料は一律（`SHIPPING_FEE_YEN`、既定 ¥1,200）
- **配送日時指定**: 配送日（`delivery_date`）・時間帯（`delivery_time_slot`）を選択可能
- **発送管理**: 管理画面で発送ステータス/追跡番号を扱う

---

## 重要ルール

### 温度帯（冷凍）を前提にする

- 冷凍配送はキャリアの冷凍便（ヤマト -15℃以下、佐川 -18℃以下）を使用
- 冷凍便は追加料金が発生（MVPでは事業側で吸収）

### カート混在制限

- **冷凍食品（FROZEN）とグッズ（AMBIENT）の同時購入は不可**
- 別注文にする運用

### 配送はオンライン決済必須

- SHIPPING 注文は `payment_method = STRIPE` かつ `temp_zone` 必須（DB制約 `orders_shipping_rules` で担保）

---

## ステータス定義

| ステータス | 説明 |
|-----------|------|
| `RESERVED` | 店頭払い受付 |
| `PENDING_PAYMENT` | **Stripe** 決済待ち |
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

#### 店頭受け取り（Stripe事前決済）
```
注文作成 → PENDING_PAYMENT → Stripe決済 → [Webhook] → PAID → 受け渡し → FULFILLED
```

#### 配送EC
```
注文作成 → PENDING_PAYMENT → Stripe決済 → [Webhook] → PAID → PACKING → SHIPPED → FULFILLED
```

---

## 画面遷移図

```
┌─────────────────────────────────────────────────────────────────────┐
│                       トップ (/[locale])                            │
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
│  [店頭払い] [Stripe]   │         │  - バリエーション選択 │
└─────┬─────────┬───────┘         │  - カートに追加       │
      │         │                 └───────────┬───────────┘
      │         ▼                             ▼
      │  ┌──────────────┐         ┌───────────────────────┐
      │  │Stripe Checkout│        │ カート /cart          │
      │  │(外部ページ)  │         │  ※温度帯混在不可     │
      │  └──────┬───────┘         └───────────┬───────────┘
      │         │                             │
      ▼         ▼                             ▼
┌───────────────────────┐         ┌───────────────────────┐
│ 完了 /complete         │         │ 配送チェックアウト    │
│  - 注文番号表示        │◄────────│ /checkout/shipping    │
│  - 注意事項            │         │  - 住所/配送日時入力  │
└───────────────────────┘         │  - Stripe Checkout    │
                                  └───────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       顧客アカウント                                 │
│ /login  → ログイン/新規登録（Supabase Auth）                        │
│ /mypage → 注文履歴                                                  │
│ /mypage/orders/[id] → 注文詳細                                      │
│ /mypage/addresses   → 配送先住所管理                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          管理画面 (/admin)                           │
│ /admin/login            → 管理者ログイン                            │
│ /admin/products         → 商品管理（区分/公開/在庫/バリエーション） │
│ /admin/news             → ニュース管理                             │
│ /admin/orders           → 注文一覧                                  │
│ /admin/orders/[id]      → 注文詳細（入金/発送/追跡）               │
│ /admin/iitate-calendar  → 台湾夜市カレンダー管理                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       その他公開ページ                               │
│ /news, /news/[slug]      → ニュース一覧・詳細                       │
│ /taiwan-night-market     → 台湾夜市特設ページ                       │
│ /legal/tokushoho         → 特定商取引法に基づく表記                 │
│ /legal/privacy           → プライバシーポリシー                     │
└─────────────────────────────────────────────────────────────────────┘
```

> 全画面の詳細は `docs/SCREEN_DESIGN.md`（画面設計書）を参照。

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
  "customer": { "name": "山田 太郎", "phone": "09012345678", "email": "taro@example.com" },
  "items": [ { "productId": "uuid-1", "qty": 2 }, { "productId": "uuid-2", "qty": 1 } ],
  "paymentMethod": "PAY_AT_PICKUP",
  "agreementAccepted": true
}
```

#### Response（店頭払い）

```json
{
  "ok": true,
  "data": { "orderId": "uuid-order", "orderNo": "20260616-ABCDEF12", "status": "RESERVED", "paymentMethod": "PAY_AT_PICKUP", "totalYen": 1800 }
}
```

#### Response（Stripe決済）

```json
{
  "ok": true,
  "data": { "orderId": "uuid-order", "orderNo": "20260616-ABCDEF12", "status": "PENDING_PAYMENT", "paymentMethod": "STRIPE", "totalYen": 1800, "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_..." }
}
```

---

### POST /api/orders/shipping

配送注文を作成する（**Stripe** オンライン決済必須）。

#### Request

```json
{
  "customer": { "name": "山田 太郎", "phone": "09012345678", "email": "taro@example.com" },
  "address": { "postalCode": "1600022", "pref": "東京都", "city": "新宿区", "address1": "新宿1-2-3", "address2": "ハイツ101" },
  "deliveryDate": "2026-06-25",
  "deliveryTimeSlot": "T14_16",
  "items": [ { "productId": "uuid-frozen-rurohan", "qty": 3 } ],
  "agreementAccepted": true
}
```

#### Response

```json
{
  "ok": true,
  "data": {
    "orderId": "uuid-order", "orderNo": "20260616-ABCDEF12", "orderType": "SHIPPING",
    "status": "PENDING_PAYMENT", "tempZone": "FROZEN",
    "subtotalYen": 3600, "shippingFeeYen": 1200, "totalYen": 4800,
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_..."
  }
}
```

---

### POST /api/webhooks/stripe

Stripe Webhook を受信し、支払い完了を処理する。

#### Headers

- `stripe-signature`: Stripe 署名（必須）

#### 処理フロー

1. 署名検証（`STRIPE_WEBHOOK_SECRET` による HMAC 検証）
2. `event.id` で冪等性チェック（`stripe_webhook_events`）
3. `checkout.session.completed` イベントで注文を `PAID` に更新、`payments` を `SUCCEEDED` に更新
4. 在庫減算（RPC `decrement_variant_stock`）、注文確認メール送信（Resend）

#### Response

- 成功: `200 OK`
- 署名NG: `400 Bad Request`

---

### POST /api/admin/orders/{orderId}/mark-paid

管理者が店頭入金を確認する（`RESERVED → PAID`）。

### POST /api/admin/orders/{orderId}/ship

発送情報（`carrier` / `trackingNo`）を登録する（`PACKING/PAID → SHIPPED`）。発送通知メールを送信。

> その他の API は `docs/FEATURE_LIST.md`（機能一覧）の API 章、および `docs/TECHNICAL.md`「8. APIリファレンス」を参照。

---

## DBスキーマ

詳細は `docs/DATABASE_DESIGN.md`（DB設計書）および `supabase/migrations/`（00001〜）を参照。

### テーブル一覧（v2.0 現行）

| テーブル | 説明 |
|---------|------|
| `admin_users` | 管理者ユーザー（Supabase Auth連携） |
| `products` | 商品マスタ（多言語・画像・食品表示・在庫） |
| `product_variants` | 商品バリエーション（サイズ別の価格・在庫） |
| `orders` | 注文（配送日時・ロケール・顧客ひも付けを含む） |
| `order_items` | 注文明細（スナップショット保持） |
| `shipping_addresses` | 配送先住所 |
| `shipments` | 発送情報 |
| `payments` | 決済情報（**Stripe** カラムを含む） |
| `stripe_webhook_events` | **Stripe** Webhook 冪等性管理 |
| `customer_profiles` | 顧客プロフィール |
| `customer_addresses` | 顧客の保存住所 |
| `news` | お知らせ |
| `iitate_calendar_events` / `iitate_calendar_month_notes` | 台湾夜市カレンダー |
| `rate_limit_buckets` | レート制限バケット（DB バックアップ用） |
| `square_webhook_events` | （旧 Square 仕様の名残・未使用） |

### 主要な制約

1. **orders_total_consistency**: `total_yen = subtotal_yen + shipping_fee_yen`
2. **orders_shipping_rules**: 配送注文は `payment_method IN ('SQUARE','STRIPE')`（実運用は STRIPE）＋ `temp_zone` 必須
3. **order_items_line_total**: `line_total_yen = unit_price_yen * qty`
4. **orders_delivery_time_slot_check**: 配送時間帯は `UNSPECIFIED/AM/T12_14/T14_16/T16_18/T18_21` のいずれか

---

## Stripe Webhook実装

### 環境変数

```env
STRIPE_SECRET_KEY=sk_xxx        # sk_ で始まること
STRIPE_WEBHOOK_SECRET=whsec_xxx # whsec_ で始まること
```

### 署名検証

`src/lib/stripe/webhook.ts` で Stripe SDK の `constructEvent` を用い、`stripe-signature` ヘッダと `STRIPE_WEBHOOK_SECRET` で署名検証する。署名不一致は `400` で拒否。Stripe API バージョン: `2025-12-15.clover`。

### Webhook処理フロー

```
1. Request受信（生ボディ）
   ↓
2. 署名検証（stripe-signature / STRIPE_WEBHOOK_SECRET）
   ↓ (失敗: 400)
3. event.id で冪等性チェック (stripe_webhook_events)
   ↓ (重複: 200 OK で終了)
4. event.type が "checkout.session.completed" かチェック
   ↓ (それ以外: 200 OK で終了)
5. payments 更新 (status=SUCCEEDED) / orders 更新 (status=PAID, paid_at)
   ↓
6. 在庫減算 (RPC) / 注文確認メール (Resend)
   ↓
7. 200 OK
```

---

## 追加機能（v2.0）

MVP（v1.0）以降に追加・実装された機能。

| 機能 | 概要 |
|-----|------|
| **顧客アカウント** | Supabase Auth によるメール/パスワード登録・ログイン。注文の顧客ひも付け（`orders.user_id`） |
| **マイページ** | 注文履歴、注文詳細、配送先住所の CRUD |
| **商品バリエーション** | サイズ別の価格・在庫（`product_variants`） |
| **多言語対応** | 日本語・繁体字中文（next-intl）。商品は `name_zh_tw` 等で翻訳 |
| **配送日時指定** | 配送日・時間帯の選択 |
| **ニュース** | お知らせの公開・一覧・詳細、管理画面での CRUD |
| **台湾夜市特設ページ／カレンダー** | 飯舘村台湾夜市の開催カレンダー（Google Calendar 連携・管理画面編集） |
| **郵便番号検索** | 住所自動入力 |
| **プライバシーポリシー** | 法定ページ追加 |

---

## 非機能要件

| 区分 | 要件 |
|-----|------|
| セキュリティ | 環境変数 Zod 検証、入力バリデーション、CSRF（Origin 検証）、レート制限（10req/min/IP）、CSP/セキュリティヘッダ、PII マスクログ、Stripe Webhook 署名検証、RLS |
| 多言語 | 全公開 URL にロケールプレフィックス（`/ja` `/zh-tw`）、デフォルト `ja` |
| 可用性 | ヘルスチェック API（`/api/health`）を提供 |
| 性能 | `docs/PERFORMANCE_AUDIT.md` 参照 |
| テスト | Vitest 13 ファイル / 133 件 |
| SEO | 公開ページに構造化データ（JSON-LD）・メタデータ |

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/FEATURE_LIST.md` | 機能一覧 |
| `docs/SCREEN_DESIGN.md` | 画面設計書 |
| `docs/DATABASE_DESIGN.md` | DB設計書 |
| `docs/SYSTEM_ARCHITECTURE.md` | システム構成図 |
| `docs/OPERATIONS_MANUAL.md` | 運用マニュアル |
| `docs/DEPLOYMENT_SELF_HOSTED.md` | デプロイ手順書 |
| `docs/TECHNICAL.md` | 技術ドキュメント |
