# momo-payment 機能一覧

**対象バージョン**: 本番リリース版（v2.0）
**最終更新**: 2026-06-16
**対象読者**: 発注者・運用担当・保守エンジニア（機能の網羅的把握用）

> 凡例: 区分 — 🛒顧客向け / 🛠管理者向け / ⚙️システム・基盤

---

## 1. 機能一覧（サマリ）

| # | 機能カテゴリ | 主な機能 | 区分 |
|---|------------|---------|:---:|
| 1 | 商品閲覧 | 商品一覧・詳細・フィルタ・バリエーション・食品表示 | 🛒 |
| 2 | カート | 追加/数量変更/削除、温度帯混在チェック | 🛒 |
| 3 | 配送EC注文 | 住所入力、配送日時指定、Stripe 決済 | 🛒 |
| 4 | 決済 | Stripe Checkout、Webhook 入金確定 | 🛒⚙️ |
| 5 | 注文完了/照会 | 完了画面、注文番号照会 | 🛒 |
| 6 | 顧客アカウント | 登録・ログイン・ログアウト | 🛒 |
| 7 | マイページ | 注文履歴・注文詳細・住所管理 | 🛒 |
| 8 | ニュース | 一覧・詳細 | 🛒 |
| 9 | 台湾夜市 | 特設ページ・開催カレンダー | 🛒 |
| 10 | 多言語 | 日本語・繁体字中文切替 | 🛒⚙️ |
| 11 | 法定ページ | 特商法・プライバシーポリシー | 🛒 |
| 12 | 商品管理 | CRUD・画像・バリエーション・並び替え | 🛠 |
| 13 | 注文管理 | 一覧・詳細・発送登録・返金 | 🛠 |
| 14 | ニュース管理 | CRUD・公開制御 | 🛠 |
| 15 | カレンダー管理 | 夜市カレンダー編集 | 🛠 |
| 16 | メール通知 | 注文確認・発送通知 | ⚙️ |
| 17 | 認証・認可 | 顧客/管理者認証、RLS | ⚙️ |
| 18 | セキュリティ | レート制限・CSRF・CSP・PII マスク・Webhook 署名 | ⚙️ |
| 19 | 運用補助 | ヘルスチェック・郵便番号検索・シード/管理者作成 | ⚙️ |

---

## 2. 顧客向け機能（詳細）

### 2.1 商品閲覧

| 機能 | 説明 | 画面 / API |
|-----|------|-----------|
| 配送EC商品一覧 | 公開商品の一覧表示、カテゴリ（冷凍食品/グッズ）フィルタ | `/shop`・`GET /api/products` |
| 商品詳細 | 商品説明・画像・価格・食品表示（原材料/アレルゲン/栄養等）・バリエーション選択 | `/shop/[slug]` |
| 商品バリエーション | サイズ別の価格・在庫を選択 | `product_variants` |
| 多言語表示 | 日本語/繁体字で商品名・説明・食品表示を切替 | `name_zh_tw` 等 |

### 2.2 カート

| 機能 | 説明 |
|-----|------|
| カート追加・数量変更・削除 | クライアント状態（`CartContext`）で管理 |
| 温度帯混在チェック | 冷凍（FROZEN）とグッズ（AMBIENT）の同時購入を禁止 |
| 小計・送料・合計表示 | 送料は配送先都道府県の地帯別運賃＋箱代（`src/lib/shipping/`） |

### 2.3 配送EC注文（SHIPPING）

| 機能 | 説明 | API |
|-----|------|-----|
| 配送チェックアウト | 配送先住所・配送日時の入力 | `/checkout/shipping` |
| 郵便番号検索 | 郵便番号から住所自動入力 | `GET /api/postal-code/lookup` |
| 配送日時指定 | 配送日・時間帯（AM/12-14/14-16/16-18/18-21 等）を選択 | — |
| 注文作成 | Stripe 決済必須。温度帯チェック | `POST /api/orders/shipping` |

### 2.4 決済（Stripe）

| 機能 | 説明 |
|-----|------|
| Stripe Checkout | Checkout Session を作成し外部決済ページへ遷移 |
| 入金確定（Webhook） | `checkout.session.completed` を受信し注文を `PAID` 化、在庫減算、確認メール送信 |
| 冪等化 | `stripe_webhook_events` による二重処理防止 |
| テスト決済 | テストカード（成功/拒否/3DS）に対応 |

### 2.5 注文完了・照会

| 機能 | 説明 | 画面 / API |
|-----|------|-----------|
| 完了画面 | 注文番号・注意事項を表示 | `/complete` |
| 注文番号照会 | 注文番号で注文を照会 | `GET /api/orders/by-no/[orderNo]` |

### 2.6 顧客アカウント・マイページ

| 機能 | 説明 | 画面 / API |
|-----|------|-----------|
| 新規登録 | メール/パスワード（Supabase Auth）。プロフィール/住所の冪等保存 | `/login`・`POST /api/auth/signup` |
| ログイン/ログアウト | セッション管理（`AuthContext` + middleware） | `/login` |
| 注文履歴 | 自身の注文一覧 | `/mypage`・`GET /api/mypage/orders` |
| 注文詳細 | 自身の注文の明細・状態 | `/mypage/orders/[id]`・`GET /api/mypage/orders/[id]` |
| 配送先住所管理 | 住所の追加/編集/削除/既定設定 | `/mypage/addresses`・`CRUD /api/mypage/addresses` |

### 2.7 コンテンツ・その他公開ページ

| 機能 | 説明 | 画面 / API |
|-----|------|-----------|
| ニュース一覧・詳細 | 公開済みお知らせの閲覧 | `/news`・`/news/[slug]`・`GET /api/news` |
| 台湾夜市特設ページ | 飯舘村台湾夜市の案内 | `/taiwan-night-market` |
| 夜市カレンダー | 開催日カレンダー（昼/夜/休/ステージ） | `GET /api/iitate-calendar` |
| 特定商取引法表記 | 法定表記 | `/legal/tokushoho` |
| プライバシーポリシー | 個人情報の取り扱い | `/legal/privacy` |
| 多言語切替 | `/ja`・`/zh-tw` のロケール切替 | 全公開ページ |

---

## 3. 管理者向け機能（詳細）

ログイン必須（`/admin/login`）。`admin_users` に登録されたユーザーのみアクセス可。

### 3.1 商品管理

| 機能 | 説明 | 画面 / API |
|-----|------|-----------|
| 商品一覧/作成/編集/削除 | CRUD | `/admin/products`・`CRUD /api/admin/products` |
| 画像アップロード | Supabase Storage（`product-images`）へアップロード（5MB上限） | `POST /api/admin/upload` |
| バリエーション管理 | サイズ別の価格・在庫 | — |
| 多言語入力 | 日本語/繁体字の商品情報 | — |
| 公開/非公開・在庫設定 | `is_active`・`stock_qty` | — |
| 並び替え | 表示順の一括更新 | `POST /api/admin/products/reorder` |

### 3.2 注文管理

| 機能 | 説明 | 画面 / API |
|-----|------|-----------|
| 注文一覧 | 注文の検索・一覧 | `/admin/orders`・`GET /api/admin/orders` |
| 注文詳細 | 明細・顧客・配送先・状態 | `/admin/orders/[id]`・`GET /api/admin/orders/[id]` |
| 発送登録 | 配送業者・追跡番号登録、`→ SHIPPED`、発送通知メール | `POST /api/admin/orders/[id]/ship` |

### 3.3 ニュース管理

| 機能 | 説明 | 画面 / API |
|-----|------|-----------|
| ニュース CRUD | 作成/編集/削除、公開制御、多言語 | `/admin/news`・`CRUD /api/admin/news` |

### 3.4 台湾夜市カレンダー管理

| 機能 | 説明 | 画面 / API |
|-----|------|-----------|
| 開催日編集 | 日付ごとの種別（昼/夜/休/ステージ）設定 | `/admin/iitate-calendar` |
| 月メモ編集 | 月単位の注記 | `POST /api/admin/iitate-calendar/month-notes` |

---

## 4. システム・基盤機能

### 4.1 認証・認可

| 機能 | 実装 |
|-----|------|
| 顧客認証 | Supabase Auth（メール/パスワード）、`AuthContext`、middleware でセッション更新 |
| 管理者認証 | Supabase Auth + `admin_users` 権限チェック（`require-admin`、middleware ガード） |
| 行レベルセキュリティ | RLS（顧客は自分のデータのみ、管理者は全件、注文書込みは service_role 経由） |

### 4.2 メール通知（Resend）

| 種別 | 契機 |
|-----|------|
| 注文確認メール | 決済完了（Webhook）時 |
| 発送通知メール | 発送登録時 |

### 4.3 セキュリティ

| 機能 | 実装ファイル |
|-----|------------|
| 環境変数検証（Zod・起動時） | `src/lib/env.ts` |
| 入力バリデーション（日本の電話/郵便番号対応） | `src/lib/validation/schemas.ts` |
| レート制限（永続・Supabase RPC。注文10/管理30/認証5 req/min/IP） | `src/lib/security/rate-limit.ts` |
| CSRF 保護（Origin/Referer 検証） | `src/lib/security/csrf.ts` |
| セキュリティヘッダ・CSP（per-request nonce 方針） | `next.config.ts`・`src/middleware.ts` |
| PII マスクログ | `src/lib/logging/secure-logger.ts` |
| Stripe Webhook 署名検証 | `src/lib/stripe/webhook.ts` |
| 個人情報レスポンスの no-store | `src/middleware.ts` |

### 4.4 運用補助

| 機能 | 説明 |
|-----|------|
| ヘルスチェック | `GET /api/health`（死活監視用） |
| 郵便番号検索 | `GET /api/postal-code/lookup` |
| 管理者作成スクリプト | `npm run create-admin` |
| 在庫減算 RPC | `decrement_variant_stock` |
| 商品並び替え RPC | `reorder_products` |

---

## 5. API エンドポイント一覧

### 公開 API

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/products` | 商品一覧 |
| GET | `/api/news` | ニュース一覧（公開） |
| GET | `/api/iitate-calendar` | 夜市カレンダー取得 |
| GET | `/api/postal-code/lookup` | 郵便番号→住所 |
| GET | `/api/orders/by-no/[orderNo]` | 注文番号照会 |
| POST | `/api/orders/shipping` | 配送注文作成 |
| POST | `/api/auth/signup` | 顧客登録 |
| GET | `/api/health` | ヘルスチェック |

### マイページ API（顧客認証必須）

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/mypage/orders` | 自分の注文一覧 |
| GET | `/api/mypage/orders/[id]` | 自分の注文詳細 |
| GET/POST | `/api/mypage/addresses` | 住所一覧/追加 |
| GET/PUT/DELETE | `/api/mypage/addresses/[id]` | 住所取得/更新/削除 |

### 管理者 API（管理者認証必須）

| メソッド | パス | 説明 |
|---------|------|------|
| GET/POST | `/api/admin/products` | 商品一覧/作成 |
| GET/PUT/DELETE | `/api/admin/products/[id]` | 商品取得/更新/削除 |
| POST | `/api/admin/products/reorder` | 並び替え |
| POST | `/api/admin/upload` | 画像アップロード |
| GET/POST | `/api/admin/news` | ニュース一覧/作成 |
| GET/PUT/DELETE | `/api/admin/news/[id]` | ニュース取得/更新/削除 |
| GET | `/api/admin/orders` | 注文一覧 |
| GET | `/api/admin/orders/[id]` | 注文詳細 |
| POST | `/api/admin/orders/[id]/ship` | 発送登録 |
| POST | `/api/admin/iitate-calendar/month-notes` | 月メモ更新 |

### Webhook

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/webhooks/stripe` | Stripe 決済イベント受信 |

---

## 6. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/REQUIREMENTS.md` | 要件定義書 |
| `docs/SCREEN_DESIGN.md` | 画面設計書 |
| `docs/DATABASE_DESIGN.md` | DB設計書 |
| `docs/SYSTEM_ARCHITECTURE.md` | システム構成図 |
| `docs/TECHNICAL.md` | 技術ドキュメント（API 詳細） |
