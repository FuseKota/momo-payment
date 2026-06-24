# momo-payment 自社サーバー向け デプロイ手順書

**対象バージョン**: 本番リリース版（Next.js 15 / App Router）
**最終更新**: 2026-06-16
**対象読者**: 自社サーバーでの構築・運用を担当するインフラ／開発エンジニア

---

## 1. 概要

本書は「もも娘」オンライン注文システム（momo-payment）を、**自社で用意したサーバー上に構築・配置**するための正式な手順書です。

本アプリケーションは静的サイトではなく、**Node.js ランタイム上で動作する Next.js（SSR + API Routes + Middleware）アプリケーション**です。したがって「ビルド済みファイルを Web サーバーに置くだけ」では動作せず、Node.js プロセスを常駐させる必要があります。

### 1.1 構成要素と自社化の可否

| 構成要素 | 役割 | 自社サーバー化 | 備考 |
|---------|------|:---:|------|
| **Web アプリ本体**（Next.js） | 画面・API・業務ロジック | ✅ 可能 | 本書の主対象 |
| **PostgreSQL** | データベース | ✅ 可能 | Supabase マネージド or 自前 PostgreSQL |
| **認証（Auth）** | 顧客／管理者ログイン | △ 条件付き | Supabase Auth に依存。自前化は Supabase セルフホストが必要 |
| **ストレージ（Storage）** | 商品画像 | △ 条件付き | Supabase Storage に依存。同上 |
| **Stripe** | 決済 | ❌ 不可 | 外部 SaaS のまま利用（必須） |
| **Resend** | メール送信 | ❌ 不可 | 外部 SaaS。SMTP 代替は要改修 |
| **Google Calendar API** | 台湾夜市カレンダー読込 | ❌ 不可 | 外部 SaaS（任意機能） |

> **重要**: 本アプリは DB だけでなく **認証・ストレージも Supabase に依存**しています。Supabase は GoTrue（Auth）・Storage・PostgREST を内包する統合プラットフォームのため、これらを丸ごと自前化するには Supabase 自体をセルフホスト（Docker）する必要があります。

### 1.2 推奨する2つの構成パターン

#### パターン A（推奨）: Web アプリのみ自社サーバー + Supabase はマネージド継続

- Web アプリを自社サーバーで稼働させ、DB・認証・ストレージは Supabase クラウドをそのまま利用。
- **改修不要**で最短。運用負荷が小さい。
- 「アプリの実行環境を自社で管理したい」という要件をほぼ満たせる。

#### パターン B: フルセルフホスト（Web アプリ + Supabase を自社サーバー）

- Supabase を Docker Compose で自社サーバーに構築し、Web アプリも自社で稼働。
- DB・認証・ストレージまで完全に自社管理下に置ける。
- **運用負荷が大きい**（Postgres / GoTrue / Storage / Realtime / Kong の保守、バックアップ、アップグレード）。
- Stripe・Resend・Google Calendar は外部 SaaS のまま。

> 以降は **パターン A** を基本として記述し、**パターン B 固有の手順**は「補足 B」として併記します。

---

## 2. 必要なサーバー仕様

### 2.1 Web アプリサーバー

| 項目 | 推奨値 |
|-----|--------|
| **OS** | Linux（Ubuntu 22.04 LTS / Rocky Linux 9 等） |
| **CPU** | 2 vCPU 以上 |
| **メモリ** | 4 GB 以上（ビルド時に 2GB+ を使用） |
| **ディスク** | 20 GB 以上（OS・Node・ビルド成果物・ログ） |
| **Node.js** | **20 LTS**（`netlify.toml` の `NODE_VERSION=20` に準拠） |
| **パッケージマネージャ** | npm（リポジトリは `package-lock.json` 管理） |
| **常駐方式** | systemd / PM2 / Docker のいずれか |
| **前段** | Nginx / Caddy（リバースプロキシ + TLS 終端） |
| **台数** | 最小 1 台。冗長化する場合は 2 台 + ロードバランサ（※後述のレート制限の注意あり） |

### 2.2 データベース（パターン B で自前 PostgreSQL を建てる場合）

| 項目 | 推奨値 |
|-----|--------|
| **PostgreSQL** | 15 以上 |
| **拡張** | `pgcrypto`（`gen_random_uuid()` を使用） |
| **CPU / メモリ** | 2 vCPU / 4 GB 以上 |
| **ディスク** | 用途に応じて。日次バックアップ前提 |

### 2.3 ネットワーク要件（外部への通信許可）

Web アプリサーバーから以下への **アウトバウンド HTTPS（443）** を許可してください。

| 宛先 | 用途 |
|-----|------|
| `*.supabase.co` | DB / Auth / Storage（パターン A） |
| `api.stripe.com` | Stripe API |
| `api.resend.com` | メール送信 |
| `www.googleapis.com` / `oauth2.googleapis.com` | Google Calendar API（任意機能） |

インバウンドは `443`（HTTPS）と Stripe Webhook の受信を許可します。

---

## 3. 事前準備（外部サービスの用意）

デプロイ前に以下のアカウント・キーを取得しておきます。

1. **Supabase プロジェクト**（パターン A）
   - プロジェクト URL / `anon` キー / `service_role` キーを控える。
2. **Stripe アカウント**（本番モード）
   - シークレットキー（`sk_live_...`）と Webhook 署名シークレット（`whsec_...`）。
3. **Resend アカウント**
   - API キー（`re_...`）、送信元ドメインの DNS 認証（SPF/DKIM）を済ませる。
   - 送信元アドレス `EMAIL_FROM`、通知先 `ADMIN_EMAIL` を決める。
4. **Google Cloud サービスアカウント**（任意機能：台湾夜市カレンダー）
   - サービスアカウントを作成し、対象カレンダーを「予定の表示（全詳細）」権限で共有。
   - `client_email` と `private_key`、カレンダー ID を控える。
5. **独自ドメイン**と DNS 管理権限（例: `https://taiwanyoichi-momomusume.com`）。

---

## 4. デプロイ手順（パターン A）

### 4.1 ランタイムのインストール

```bash
# Node.js 20 LTS（nvm 利用例）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20
nvm use 20
node -v   # v20.x であること
```

### 4.2 ソースコードの取得

```bash
# 納品リポジトリを配置（例）
sudo mkdir -p /opt/momo-payment
sudo chown "$USER" /opt/momo-payment
git clone <納品リポジトリURL> /opt/momo-payment
cd /opt/momo-payment
```

### 4.3 依存パッケージのインストール

```bash
npm ci   # package-lock.json に厳密一致でインストール
```

### 4.4 環境変数の設定

`.env.example` を雛形に `.env.local`（本番値）を作成します。**このファイルは絶対にリポジトリにコミットしないでください。**

```bash
cp .env.example .env.local
# エディタで本番値を設定
```

#### 必須環境変数一覧

| 変数 | 必須 | 例 / 形式 | 説明 |
|-----|:---:|-----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://xxxx.supabase.co` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | `eyJ...` | 公開可能な anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | `eyJ...` | **秘密**。サーバー専用。公開厳禁 |
| `STRIPE_SECRET_KEY` | ✅ | `sk_live_...`（`sk_` 始まり） | **秘密**。Stripe シークレットキー |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_...`（`whsec_` 始まり） | **秘密**。Webhook 署名検証用 |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://taiwanyoichi-momomusume.com` | 本番の公開 URL（末尾スラッシュなし） |
| `RESEND_API_KEY` | 本番✅ | `re_...` | **秘密**。Resend API キー |
| `EMAIL_FROM` | 本番✅ | `noreply@example.com` | メール送信元 |
| `ADMIN_EMAIL` | 本番✅ | `admin@example.com` | 管理者通知先 |
| `GOOGLE_CALENDAR_CLIENT_EMAIL` | 本番✅ | `xxx@xxx.iam.gserviceaccount.com` | サービスアカウント |
| `GOOGLE_CALENDAR_PRIVATE_KEY` | 本番✅ | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` | **秘密**。改行は `\n` エスケープで 1 行記述 |
| `GOOGLE_CALENDAR_ID` | 本番✅ | `xxx@group.calendar.google.com` | 対象カレンダー ID |
| `GOOGLE_CALENDAR_TIMEZONE` | 任意 | `Asia/Tokyo`（既定） | タイムゾーン |
| `NODE_ENV` | ✅ | `production` | 本番は必ず `production` |

> 環境変数は `src/lib/env.ts` で **Zod により起動時検証**されます。`NODE_ENV=production` のときは Email・Google Calendar 系も必須となり、未設定だと起動時にエラーで停止します（不正設定の早期検出）。

### 4.5 データベースの初期化（マイグレーション）

DB スキーマは `supabase/migrations/` に**連番付き SQL（00001〜）**として全量バージョン管理されています。再現可能な形で適用してください。

**Supabase CLI を使う場合（推奨）:**

```bash
# Supabase CLI のインストール
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref <your-project-ref>

# マイグレーション適用
supabase db push
```

**psql で直接適用する場合（パターン B 等）:**

```bash
for f in supabase/migrations/*.sql; do
  echo "applying $f"
  psql "$DATABASE_URL" -f "$f"
done
```

> マイグレーションには RLS（Row Level Security）ポリシー、ストレージバケット作成、レート制限テーブル、在庫減算 RPC などが含まれます。**必ず連番順に全件適用**してください。

### 4.6 ストレージバケットの確認

`00002_storage_bucket.sql` により商品画像用バケット `product-images`（公開・5MB 上限・jpeg/png/webp/gif 許可）が作成されます。マイグレーション適用後、Supabase ダッシュボードで存在を確認してください。

### 4.7 管理者アカウントの作成

```bash
npm run create-admin
# scripts/create-admin.ts が対話的に管理者を作成
```

新規 Supabase プロジェクトへ移行する場合は `scripts/create-admin-on-new.ts` を利用します。

### 4.8 （任意）検証用データの投入

検証用の商品・在庫データは管理画面（`/admin/products`）から登録します。

> **本番環境では原則シード不要**です。実データは管理画面から登録します。

### 4.9 本番ビルド

```bash
npm run build   # .next/ に本番成果物を生成
```

### 4.10 起動（プロセス常駐）

`next start` は既定で **ポート 3000** で待ち受けます。本番ではプロセスマネージャで常駐させます。

#### systemd の例（推奨）

`/etc/systemd/system/momo-payment.service`:

```ini
[Unit]
Description=momo-payment (Next.js)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/momo-payment
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/opt/momo-payment/.env.local
ExecStart=/home/<user>/.nvm/versions/node/v20.x/bin/npm run start
Restart=always
RestartSec=5
User=<user>

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now momo-payment
sudo systemctl status momo-payment
```

#### PM2 の例（代替）

```bash
npm install -g pm2
pm2 start "npm run start" --name momo-payment
pm2 save
pm2 startup   # OS 起動時に自動起動
```

### 4.11 リバースプロキシ + TLS（Nginx 例）

`/etc/nginx/sites-available/momo-payment`:

```nginx
server {
    listen 443 ssl http2;
    server_name taiwanyoichi-momomusume.com;

    ssl_certificate     /etc/letsencrypt/live/taiwanyoichi-momomusume.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/taiwanyoichi-momomusume.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
    }
}

server {
    listen 80;
    server_name taiwanyoichi-momomusume.com;
    return 301 https://$host$request_uri;
}
```

```bash
# Let's Encrypt 証明書取得
sudo certbot --nginx -d taiwanyoichi-momomusume.com
sudo nginx -t && sudo systemctl reload nginx
```

> セキュリティヘッダー（HSTS / CSP / X-Frame-Options 等）は **アプリ側（`next.config.ts` と `src/middleware.ts`）で付与**されます。Nginx 側で重複設定しないよう注意してください（CSP は per-request nonce を含むためアプリ側が正）。

### 4.12 Stripe Webhook の設定

1. Stripe ダッシュボード → 開発者 → Webhook → エンドポイント追加。
2. URL: `https://taiwanyoichi-momomusume.com/api/webhooks/stripe`
3. 購読イベント: 最低限 `checkout.session.completed`（決済完了）。
4. 発行された署名シークレット（`whsec_...`）を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定し、アプリを再起動。

> Webhook は `src/lib/stripe/webhook.ts` で**署名検証**されます。署名不一致のリクエストは拒否されます。Stripe API バージョンは `2025-12-15.clover`。

### 4.13 動作確認（スモークテスト）

```bash
# トップページ
curl -I https://taiwanyoichi-momomusume.com/ja

# 商品一覧 API
curl https://taiwanyoichi-momomusume.com/api/products
```

ブラウザで以下を確認：

- [ ] トップページ表示（`/ja`, `/zh-tw`）
- [ ] 商品一覧・詳細表示
- [ ] カート → チェックアウト → Stripe 決済（テストカード `4242 4242 4242 4242`）
- [ ] 決済完了後に注文確認メールが届く
- [ ] 管理画面ログイン（`/admin/login`）と注文一覧表示
- [ ] レスポンスヘッダーに `Content-Security-Policy` / `Strict-Transport-Security` が付与されている

---

## 5. 補足 B: フルセルフホスト（Supabase 自社構築）

パターン B を採用する場合の追加手順の要点です。

1. **Supabase を Docker Compose で構築**
   - 公式の self-hosting 構成（`supabase/docker`）を利用。Postgres / GoTrue（Auth）/ Storage / PostgREST / Kong を起動。
   - 公式手順: https://supabase.com/docs/guides/self-hosting/docker
2. **環境変数を自社 Supabase 向けに変更**
   - `NEXT_PUBLIC_SUPABASE_URL` を自社 Kong エンドポイントへ。
   - `anon` / `service_role` キーは自社 Supabase の JWT シークレットから発行したものに差し替え。
3. **マイグレーション適用**（4.5 の psql 方式）。
4. **ストレージバケット作成**（`product-images`）を確認。
5. **Auth 設定**: メール確認・SMTP（Resend 等）・サイト URL・リダイレクト URL を自社 Supabase の設定で行う。
6. **バックアップ運用**: Postgres の論理/物理バックアップ、Storage のオブジェクトバックアップを自社で構築。

> パターン B は Postgres・Auth・Storage の保守責任を自社が負うため、**専任の運用体制が必要**です。要件が「アプリ実行環境の自社管理」であればパターン A を強く推奨します。

---

## 6. （任意）Docker による Web アプリのコンテナ化

リポジトリに Dockerfile は同梱されていません。コンテナ運用する場合の参考構成を示します（Next.js standalone 出力を使うとイメージが軽量になります）。

```dockerfile
# Dockerfile（参考）
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
```

> `output: 'standalone'` を `next.config.ts` に追加するとさらに軽量化できますが、現状未設定のため上記は通常ビルド前提です。コンテナ採用時は環境変数を `--env-file .env.local` 等で注入してください。

---

## 7. 更新（再デプロイ）手順

```bash
cd /opt/momo-payment
git pull                      # 新バージョン取得
npm ci                        # 依存更新
# DB スキーマ変更がある場合のみ:
supabase db push              # or psql で新規マイグレーションを適用
npm run build                 # 再ビルド
sudo systemctl restart momo-payment   # 再起動（PM2 なら pm2 restart momo-payment）
```

> ダウンタイムを避ける場合は、ビルド完了後にプロセスを切り替える Blue/Green 構成、または 2 台構成でローリング再起動を検討してください。

---

## 8. ロールバック手順

```bash
cd /opt/momo-payment
git log --oneline             # 直前の安定タグ/コミットを確認
git checkout <安定版コミット>
npm ci && npm run build
sudo systemctl restart momo-payment
```

- **DB マイグレーションを伴う変更のロールバック**は破壊的になり得るため、事前にバックアップを取得し、慎重に行ってください（本番 DB は物理削除を避ける方針）。

---

## 9. よくある注意点

| 事象 | 原因 / 対処 |
|-----|------------|
| 起動時に `Invalid environment variables` で停止 | `NODE_ENV=production` で必須変数が未設定。`src/lib/env.ts` のエラー出力を確認 |
| Stripe Webhook が 400 | 署名シークレット不一致。`STRIPE_WEBHOOK_SECRET` を再確認しアプリ再起動 |
| 画像が表示されない | `product-images` バケット未作成、または `next.config.ts` の `remotePatterns` に Supabase ホスト不一致 |
| メールが届かない | `RESEND_API_KEY` 未設定 / 送信元ドメインの DNS（SPF/DKIM）未認証 |
| 複数台構成でレート制限が緩い | レート制限は Supabase Postgres の永続ストア（RPC `check_rate_limit`）で実装済み。水平スケールしても共有カウンタとして機能する |
| 管理画面に入れない | `npm run create-admin` で管理者未作成、または Cookie/HTTPS 設定の問題 |

---

## 10. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/SYSTEM_ARCHITECTURE.md` | システム構成図（清書版） |
| `docs/OPERATIONS_MANUAL.md` | 運用マニュアル |
| `docs/TECHNICAL.md` | 技術ドキュメント（API・DB・セキュリティ詳細） |
| `docs/REQUIREMENTS.md` | 要件定義書 |
| `.env.example` | 環境変数テンプレート |
| `supabase/migrations/` | DB スキーマ（マイグレーション SQL） |
