# momo-payment システム構成図（清書版）

**対象バージョン**: 本番リリース版（Next.js 15 / App Router）
**最終更新**: 2026-06-16
**注記**: 図は [Mermaid](https://mermaid.js.org/) 記法。GitHub / VS Code（Markdown Preview Mermaid）/ Mermaid Live Editor 等でレンダリング表示されます。

---

## 1. システムコンテキスト図

システム全体と、利用者・外部サービスの関係を示します。

```mermaid
graph TB
    subgraph Users["利用者"]
        Customer["👤 顧客<br/>（PC / スマホ ブラウザ）"]
        Admin["🛠 管理者<br/>（店舗スタッフ）"]
    end

    subgraph System["momo-payment システム"]
        App["Next.js アプリ<br/>（画面 + API + Middleware）"]
    end

    subgraph Supabase["Supabase（マネージド）"]
        DB[("PostgreSQL")]
        Auth["Auth<br/>（GoTrue）"]
        Storage["Storage<br/>（商品画像）"]
    end

    subgraph External["外部 SaaS"]
        Stripe["💳 Stripe<br/>決済"]
        Resend["✉️ Resend<br/>メール送信"]
        GCal["📅 Google Calendar API<br/>（夜市カレンダー・任意）"]
    end

    Customer -->|HTTPS| App
    Admin -->|HTTPS /admin| App
    App -->|SQL / Auth / 画像| DB
    App --> Auth
    App --> Storage
    App -->|Checkout / API| Stripe
    Stripe -->|Webhook| App
    App -->|注文確認・発送通知| Resend
    App -->|イベント取得| GCal
```

---

## 2. デプロイトポロジ

### 2.1 現状構成（マネージド / Netlify）

```mermaid
graph LR
    User["👤 利用者"]
    subgraph Netlify["Netlify（ホスティング）"]
        Edge["Edge / CDN"]
        Fn["Next.js<br/>Server Functions"]
    end
    subgraph Supabase["Supabase Cloud"]
        DB[("PostgreSQL")]
        Auth["Auth"]
        Storage["Storage"]
    end
    Stripe["Stripe"]
    Resend["Resend"]

    User -->|HTTPS| Edge
    Edge --> Fn
    Fn --> DB
    Fn --> Auth
    Fn --> Storage
    Fn --> Stripe
    Fn --> Resend
    Stripe -->|Webhook| Fn
```

### 2.2 自社サーバー構成（パターン A: Web アプリのみ自社 + Supabase マネージド継続）

```mermaid
graph LR
    User["👤 利用者"]

    subgraph OnPrem["自社サーバー（Linux / Node 20）"]
        Nginx["Nginx<br/>（TLS終端 / リバプロ）"]
        Node["Next.js プロセス<br/>（systemd / PM2 / Docker）<br/>:3000"]
    end

    subgraph Supabase["Supabase Cloud"]
        DB[("PostgreSQL")]
        Auth["Auth"]
        Storage["Storage"]
    end
    Stripe["Stripe"]
    Resend["Resend"]

    User -->|HTTPS:443| Nginx
    Nginx -->|HTTP:3000| Node
    Node --> DB
    Node --> Auth
    Node --> Storage
    Node --> Stripe
    Node --> Resend
    Stripe -->|Webhook| Nginx
```

### 2.3 フルセルフホスト構成（パターン B: Supabase も自社）

```mermaid
graph LR
    User["👤 利用者"]

    subgraph OnPrem["自社サーバー群"]
        Nginx["Nginx（TLS / リバプロ）"]
        Node["Next.js プロセス :3000"]
        subgraph SB["Supabase（Docker Compose）"]
            Kong["Kong（API Gateway）"]
            PG[("PostgreSQL")]
            GoTrue["GoTrue（Auth）"]
            Stor["Storage"]
        end
    end
    Stripe["Stripe（外部）"]
    Resend["Resend（外部）"]

    User -->|HTTPS| Nginx
    Nginx --> Node
    Node --> Kong
    Kong --> PG
    Kong --> GoTrue
    Kong --> Stor
    Node --> Stripe
    Node --> Resend
    Stripe -->|Webhook| Nginx
```

---

## 3. アプリケーション内部構成（コンポーネント図）

```mermaid
graph TB
    subgraph Client["クライアント（ブラウザ）"]
        Pages["画面（React / MUI / Tailwind）<br/>[locale] ルート + /admin"]
        Ctx["状態管理<br/>CartContext / AuthContext"]
    end

    subgraph Server["Next.js サーバー"]
        MW["middleware.ts<br/>セキュリティヘッダ / CSP / セッション更新 / 管理ガード"]
        API["API Routes<br/>(/api/*)"]

        subgraph Lib["src/lib（共通ロジック）"]
            EnvL["env.ts（Zod検証）"]
            Guards["api/admin-guards / order-guards<br/>auth/require-admin / require-customer"]
            Valid["validation/schemas（Zod）"]
            Sec["security/rate-limit / csrf"]
            Log["logging/secure-logger（PIIマスク）"]
            Price["api/price-calc"]
            SBClient["supabase/(server|admin|client)"]
            StripeL["stripe/(client|webhook)"]
            EmailL["email/resend"]
        end
    end

    subgraph Ext["外部"]
        SB[("Supabase")]
        ST["Stripe"]
        RS["Resend"]
        GC["Google Calendar"]
    end

    Pages --> Ctx
    Pages -->|fetch| MW
    MW --> API
    API --> Guards
    API --> Valid
    API --> Sec
    API --> Price
    API --> SBClient
    API --> StripeL
    API --> EmailL
    API --> Log
    SBClient --> SB
    StripeL --> ST
    EmailL --> RS
    API --> GC
    EnvL -.起動時検証.-> Server
```

---

## 4. リクエスト処理フロー（注文〜決済）

配送 EC の Stripe 決済を例にした主要シーケンスです。

```mermaid
sequenceDiagram
    autonumber
    participant U as 顧客ブラウザ
    participant MW as Middleware
    participant API as API Route
    participant DB as Supabase(DB)
    participant ST as Stripe

    U->>MW: POST /api/orders/shipping（注文確定）
    MW->>MW: CSPヘッダ付与 / セッション更新 / レート制限
    MW->>API: 通過
    API->>API: CSRF(Origin)検証 / Zod入力検証
    API->>DB: 注文(orders/order_items/shipping_addresses)作成 [PENDING_PAYMENT]
    API->>ST: Checkout Session 作成
    ST-->>API: セッションURL
    API-->>U: 決済URLへリダイレクト
    U->>ST: カード入力・決済
    ST-->>U: 完了画面へ
    ST->>MW: Webhook (checkout.session.completed)
    MW->>API: /api/webhooks/stripe
    API->>API: 署名検証（stripe/webhook.ts）
    API->>DB: 冪等化(stripe_webhook_events) / payments作成 / status=PAID
    API->>DB: 在庫減算(RPC) / 注文確認メール送信(Resend)
```

---

## 5. データモデル（ER 概要）

```mermaid
erDiagram
    admin_users {
        uuid id PK
        text email
    }
    products ||--o{ product_variants : has
    products {
        uuid id PK
        text slug
        enum kind "FROZEN_FOOD / GOODS"
        enum temp_zone "AMBIENT / FROZEN"
        jsonb food_label
    }
    product_variants ||--o{ order_items : ordered_as
    orders ||--o{ order_items : contains
    orders ||--o| payments : has
    orders ||--o| shipping_addresses : ships_to
    orders ||--o{ shipments : fulfilled_by
    orders {
        uuid id PK
        text order_no
        enum order_type "SHIPPING"
        enum status
        text locale "ja / zh-tw"
    }
    payments {
        uuid id PK
        enum payment_method "STRIPE"
        enum status
    }
    customer_profiles ||--o{ customer_addresses : has
    stripe_webhook_events {
        text event_id PK "冪等化キー"
    }
    news {
        uuid id PK
        text slug
    }
    iitate_calendar_events {
        uuid id PK
    }
    rate_limit_buckets {
        text key PK
    }
```

> 完全なテーブル定義・制約・RLS ポリシーは `docs/TECHNICAL.md`「7. DBスキーマ」および `supabase/migrations/`（00001〜）を参照。

### 主なテーブル一覧

| 分類 | テーブル |
|-----|---------|
| 認証・管理 | `admin_users` |
| 商品 | `products` / `product_variants` |
| 注文 | `orders` / `order_items` / `shipping_addresses` / `shipments` / `payments` |
| 顧客 | `customer_profiles` / `customer_addresses` |
| 決済連携 | `stripe_webhook_events`（`square_webhook_events` は旧仕様の名残） |
| コンテンツ | `news` |
| 夜市カレンダー | `iitate_calendar_events` / `iitate_calendar_month_notes` |
| インフラ | `rate_limit_buckets` |

---

## 6. ステータス遷移

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT: Stripe決済開始
    PENDING_PAYMENT --> PAID: Webhook(決済完了)
    PENDING_PAYMENT --> CANCELED: Webhook(セッション失効)
    PAID --> PACKING: 配送・梱包開始
    PACKING --> SHIPPED: 発送登録(追跡番号)
    SHIPPED --> FULFILLED: 配送完了
    PAID --> REFUNDED: 返金
    FULFILLED --> [*]
```

- **配送（Stripe）**: `PENDING_PAYMENT → PAID → PACKING → SHIPPED → FULFILLED`
- **キャンセル（決済前）**: `PENDING_PAYMENT → CANCELED`
- **返金**: `PAID 以降 → REFUNDED`

---

## 7. 技術スタック

| レイヤー | 採用技術 | バージョン |
|---------|---------|-----------|
| 言語 | TypeScript | 5.x |
| フレームワーク | Next.js（App Router） | 15.x |
| UI ライブラリ | React | 19.x |
| UI コンポーネント | MUI（Material UI） | 7.x |
| スタイリング | Tailwind CSS | 4.x |
| 国際化 | next-intl（`ja` / `zh-tw`） | 4.x |
| バリデーション | Zod | 4.x |
| DB / 認証 / ストレージ | Supabase（PostgreSQL 15+） | — |
| 決済 | Stripe SDK（API `2025-12-15.clover`） | 20.x |
| メール | Resend | 6.x |
| カレンダー連携 | google-auth-library | 10.x |
| テスト | Vitest（13ファイル / 133件） | 4.x |
| ランタイム | Node.js | 20 LTS |
| ホスティング（現状） | Netlify（`@netlify/plugin-nextjs`） | — |

---

## 8. セキュリティ境界

```mermaid
graph LR
    subgraph Public["公開（ブラウザに露出）"]
        A["NEXT_PUBLIC_SUPABASE_URL"]
        B["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
        C["NEXT_PUBLIC_APP_URL"]
    end
    subgraph Secret["サーバー専用（露出厳禁）"]
        D["SUPABASE_SERVICE_ROLE_KEY"]
        E["STRIPE_SECRET_KEY"]
        F["STRIPE_WEBHOOK_SECRET"]
        G["RESEND_API_KEY"]
        H["GOOGLE_CALENDAR_PRIVATE_KEY"]
    end
```

**多層防御の要点**

| 対策 | 実装 |
|-----|------|
| 環境変数検証 | `src/lib/env.ts`（Zod・起動時） |
| 入力バリデーション | `src/lib/validation/schemas.ts`（Zod） |
| CSRF 保護 | `src/lib/security/csrf.ts`（Origin/Referer 検証） |
| レート制限 | `src/lib/security/rate-limit.ts`（10req/min/IP・インメモリ） |
| セキュリティヘッダ / CSP | `next.config.ts` + `src/middleware.ts`（per-request nonce） |
| PII マスクログ | `src/lib/logging/secure-logger.ts` |
| Webhook 署名検証 | `src/lib/stripe/webhook.ts` |
| RLS | `supabase/migrations/00011_*` 他 |
| 管理者ガード | `src/lib/auth/require-admin.ts` + middleware |
| 個人情報レスポンスの no-store | `src/middleware.ts`（`/api/mypage` 等） |

---

## 9. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/DEPLOYMENT_SELF_HOSTED.md` | 自社サーバー向けデプロイ手順書 |
| `docs/OPERATIONS_MANUAL.md` | 運用マニュアル |
| `docs/TECHNICAL.md` | 技術ドキュメント（API・DB・セキュリティ詳細） |
| `docs/REQUIREMENTS.md` | 要件定義書 |
