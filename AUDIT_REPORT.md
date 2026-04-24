# 本番公開前 セキュリティ・SRE監査レポート

**対象**: momo-payment（Next.js 15 / TypeScript / Supabase / Stripe）
**監査日**: 2026-04-24
**監査者**: シニアセキュリティエンジニア兼SRE観点
**デプロイ想定**: Vercel（`.vercel/project.json` 存在）/ Netlify（`netlify.toml` 存在）の両方設定あり

---

## エグゼクティブサマリ

### 総合判定: 🔴 **条件付き可（Critical 4件の解消が公開ブロッカー）**

Stripe Webhook署名検証、CSRF Origin検証、Supabase RLSの多層構成、PIIマスク付きロガー、Zod入力検証、`getUser()` によるJWT再検証、管理者認可の別テーブル照合など、基本的なセキュリティレイヤは丁寧に組まれています。しかし本番を見据えたとき、**サーバレス環境における防御機構の機能不全**と、**CSPの実効性喪失**が深刻で、これらは必ず公開前に対応が必要です。

### 件数
- **Critical**: 4件
- **High**: 7件
- **Medium**: 13件
- **Low**: 9件

### 公開までに必ず対応すべき項目トップ5
1. **SEC-001**: サーバレス環境での in-memory rate limit は実質無効 → 永続ストア(Upstash Redis / Supabase) に移行
2. **SEC-002**: CSP の `'unsafe-inline' 'unsafe-eval'` で XSS 緩和が無効化 → nonce / strict-dynamic へ移行
3. **SEC-003**: AdminShell の Hooks 順序違反（条件付き早期return後の useEffect）→ ランタイムクラッシュのリスク
4. **DEP-001**: Next.js 15.5.14 に High 重大度の DoS 脆弱性 (GHSA-q4gf-8mx6-v5v3) → `npm audit fix`
5. **DB-001**: `generate_order_no()` が `stable` 宣言（本来 `volatile`）→ PostgreSQL のクエリキャッシュにより同一 order_no が連続発行される潜在バグ

---

## 検出された問題一覧

---

### 🔴 Critical

---

#### SEC-001: in-memory レート制限がサーバレスで実効性を持たない
- **カテゴリ**: レート制限 / DoS 耐性
- **ファイル**: `src/lib/security/rate-limit.ts:12`

```ts
const rateLimitMap = new Map<string, RateLimitRecord>();
```

- **問題**: Vercel/Netlify のサーバレス関数は水平スケールし、各インスタンスが独立したメモリ空間を持つため、`Map` 型の状態は**インスタンス間で共有されない**。また、コールドスタート毎に Map がリセットされる。結果、`checkOrderRateLimit` 等の「10 req/min/IP」は**Nインスタンス並列時には N×10 req/min まで通過**する。ブルートフォース・スキャン（例: ゲスト注文番号のスクレイピング）が実質無制限。
- **攻撃シナリオ**: 攻撃者が `/api/orders/by-no/{orderNo}` を複数スレッドで一斉リクエストすると、各 Lambda インスタンスの Map に独立したカウンタが立つため上限に到達しない。
- **推奨修正案**:
  - Upstash Redis (`@upstash/ratelimit`) や Vercel KV で分散ストア化
  - Supabase Postgres の `counter_increment` RPC で代替
  - Netlify 側なら Netlify Edge Functions + DynamoDB などを検討
- **工数**: **M**（1-2日）

---

#### SEC-002: CSP の `'unsafe-inline' 'unsafe-eval'` が XSS 防御を無効化
- **カテゴリ**: コンテンツセキュリティポリシー
- **ファイル**: `next.config.ts:14-18`

```ts
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
```

- **問題**: `'unsafe-inline'` は `<script>alert(1)</script>` などインラインスクリプトを無条件に許可するため、XSS が発生した場合に CSP による緩和が全く効かない。`'unsafe-eval'` は `eval()` / `new Function()` を許可し、テンプレート注入からの RCE を可能にする。Next.js App Router では `nonce` ベースの CSP が公式サポートされており、両ディレクティブは不要。
- **攻撃シナリオ**: `JsonLd.tsx:5` の `dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}` が将来ユーザー入力を含む場合、`</script><script>…` 注入でスクリプト実行。CSP がこれを止めない。
- **推奨修正案**:
  - Middleware で nonce を生成 → Response ヘッダに `script-src 'self' 'nonce-xxx' 'strict-dynamic'`
  - Next.js 公式ガイド: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
  - `'unsafe-eval'` は即削除可能（現コードは依存していない）
  - Stripe.js 用に `https://js.stripe.com` は維持
- **工数**: **M**（1日、nonce伝播のテスト含む）

---

#### SEC-003: AdminShell で Rules of Hooks 違反（条件付き early return 後の useEffect）
- **カテゴリ**: ランタイム安定性
- **ファイル**: `src/app/admin/AdminShell.tsx:47-73`

```tsx
// Skip layout for login page
if (pathname === '/admin/login') {
  return <>{children}</>;         // ← 早期return
}

// Show loading while checking auth
if (isLoading) {
  return (<CircularProgress />);  // ← 早期return
}

// Redirect to login if not admin
useEffect(() => {                 // ← 条件付きで呼ばれる useEffect
  if (!isLoading && !isAdmin) {
    router.push('/admin/login');
  }
}, [isLoading, isAdmin, router]);
```

- **問題**: React の Hooks ルール違反。`useEffect` は毎レンダリングで同じ順序で呼ばれなければならないが、`/admin/login` ページや `isLoading` 中は early return され `useEffect` が呼ばれない。他ルートに遷移した瞬間に Hook 呼び出し順が変化し、`Rendered fewer hooks than expected` エラーで React ツリーが破壊される。本番では白画面の可能性。
- **推奨修正案**: 早期 return を useEffect の**後**に移動、もしくは条件分岐を useEffect の内部で行う。
  ```tsx
  useEffect(() => {
    if (!isLoading && !isAdmin && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [isLoading, isAdmin, router, pathname]);

  if (pathname === '/admin/login') return <>{children}</>;
  if (isLoading) return <CircularProgress />;
  if (!isAdmin) return null;
  ```
- **工数**: **S**（30分）

---

#### DEP-001: Next.js に High 重大度の脆弱性
- **カテゴリ**: 依存ライブラリ脆弱性
- **対象**: `package.json` dependencies.next `^15.5.14`

- **問題**: `npm audit --production` の結果:
  - **Next.js**: GHSA-q4gf-8mx6-v5v3（CVSS 7.5, Server Components 経由の DoS、影響範囲 `>=13.0.0 <15.5.15`）
  - **next-intl**: GHSA-8f24-v5vv-gm5j（オープンリダイレクト、`<4.9.1`）
  - **picomatch**: GHSA-3v7f-55p6-f55p / GHSA-c2c7-rcm5-vvqj（ReDoS, Method Injection）
  - **svix/uuid/qs/yaml**: 各種 moderate

  計 8 件（High 2 / Moderate 5 / Low 1）。
- **推奨修正案**:
  ```bash
  npm audit fix
  # 残存する moderate (uuid in resend) は --force 要確認:
  npm audit fix --force  # resend が 6.1.3 に戻るため動作確認要
  ```
- **工数**: **S**（30分、回帰テスト除く）

---

### 🟠 High

---

#### SEC-101: `/api/auth/signup` に CSRF / レート制限なし
- **カテゴリ**: CSRF / ブルートフォース
- **ファイル**: `src/app/api/auth/signup/route.ts:14-89`

- **問題**: `validateOrigin` も `checkRateLimit` も呼んでいない。Supabase Auth の signInWithPassword / signUp 自体は Supabase 側のレート制限がある（デフォルト 30req/5min）が、この API はサインアップ完了後の `customer_profiles` / `customer_addresses` の INSERT を行う。セッション付きブラウザが罠サイトから POST され、任意の name/phone/address で上書き（INSERT なので現状は重複エラーになるが、住所は追加される）される可能性。
- **推奨修正案**: 他の顧客 API (`/api/mypage/addresses`) と同様に `validateOrigin(request)` を実施。レート制限も追加。
- **工数**: **S**

---

#### SEC-102: 管理者 API で DB `error.message` を直接返却
- **カテゴリ**: 情報漏洩（内部実装の露出）
- **ファイル**:
  - `src/app/api/admin/products/route.ts:20, 55`
  - `src/app/api/admin/products/[id]/route.ts` は `'Internal server error'` で隠蔽済み（OK）

```ts
// route.ts:20
if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

- **問題**: PostgreSQL のエラーメッセージはテーブル名・カラム名・制約名を含み得る。管理者向けとはいえ、攻撃者が奪取した管理者セッション経由で DB スキーマを推測される材料になる。
- **推奨修正案**: 他 API と同様 `'Internal server error'` に変更し、詳細は `secureLog` で記録。
- **工数**: **S**

---

#### SEC-103: Admin 商品並び替えに DB トランザクションなし
- **カテゴリ**: データ整合性
- **ファイル**: `src/app/api/admin/products/reorder/route.ts:30-34`

```ts
await Promise.all(
  items.map(({ id, sort_order }) =>
    supabase.from('products').update({ sort_order }).eq('id', id)
  )
);
```

- **問題**: N 本の UPDATE を並列実行。ネットワーク断や 1 件の失敗が発生すると、一部のみ反映された不整合状態で残る。呼び出し側にもエラーが伝わらない（`Promise.all` のエラーは catch で 500 化されるが、既に書き込まれた部分は戻せない）。
- **推奨修正案**: Supabase RPC を作成し、1 つのトランザクションで複数行を `CASE WHEN id = ... THEN ...` で一括 UPDATE、または `upsert` で複数行送信。
- **工数**: **S-M**

---

#### SEC-104: 商品画像アップロードの MIME 検証がクライアント申告値依存
- **カテゴリ**: ファイルアップロード検証
- **ファイル**: `src/lib/storage/upload.ts:19`, `src/app/api/admin/upload/route.ts:13`

```ts
if (!ALLOWED_TYPES.includes(file.type)) { ... }
```

- **問題**: `file.type` はブラウザが `Content-Type` ヘッダから設定する値で偽装可能。攻撃者が `file.type = "image/png"` として HTML ファイルや SVG 相当をアップロード可能。Supabase Storage 側の `allowed_mime_types` で二次フィルタが効くため実害は限定的だが、多層防御の観点で app 側も magic byte（マジックナンバー）で検証すべき。
- **追加**: 拡張子は `file.name.split('.').pop()` で取得されており、`.php5` `.svg.jpg` 等のファイル名でも通過する（`productSlug` に依存したパス作成のため深刻ではないが、拡張子allowlist 化が望ましい）。
- **推奨修正案**:
  - 先頭数バイトで画像シグネチャ検証（`file-type` npm パッケージ等）
  - 拡張子を `['jpg','jpeg','png','webp','gif']` allowlist
  - ファイル名全体を `crypto.randomUUID()` に置き換え、ユーザー提供名は保存しない
- **工数**: **S**

---

#### SEC-105: Stripe Webhook に IP レート制限なし
- **カテゴリ**: DoS 耐性
- **ファイル**: `src/app/api/webhooks/stripe/route.ts:18-32`

- **問題**: 署名検証が先に走るので不正署名は安価に弾ける（CPU負荷は軽度）が、大量の不正リクエストで Stripe SDK の `constructEvent` を呼ばせて CPU を消費させられる。現状 `checkWebhookRateLimit` が定義済み（`rate-limit.ts:73`）にも関わらず適用されていない。
- **推奨修正案**: 署名検証より前に IP レート制限（100req/min/IP）を適用。
- **工数**: **S**

---

#### SEC-106: 顧客注文一覧の RLS 重複ポリシー（多層防御として許容だが確認要）
- **カテゴリ**: 認可
- **ファイル**:
  - `supabase/migrations/00001_initial_schema.sql:337-342` — `orders_admin_all` (ALL)
  - `supabase/migrations/00008_add_customer_accounts.sql:66-67` — `orders_select_own` (SELECT)

- **問題**: 現在の API 実装はすべて `service_role` 経由（`getSupabaseAdmin()`）で RLS をバイパスしているため、上記ポリシーは多層防御。アプリ側の権限チェックバグが起きても RLS が最後の防波堤になるが、 現状:
  - `orders` テーブルに対して `auth.uid() = user_id` の行レベル SELECT のみ。
  - INSERT / UPDATE は管理者権限 (`is_admin()`) のみで、本人の注文作成は RLS 経由では不可。これは現状のアプリが `service_role` で挿入しているため整合しているが、将来 anon / authenticated 経由で使う場合に破綻する。
- **推奨修正案**: RLS に依存した方針を docs に明文化し、`service_role` bypass を前提にした設計である旨を残す。意図せず anon クライアントから書き込まれた際に即時 reject されることを明示。
- **工数**: **S**（確認と文書化のみ）

---

#### SEC-107: RESEND_API_KEY が optional で未設定時に実行時エラー
- **カテゴリ**: 起動時検証 / 本番設定漏れ
- **ファイル**: `src/lib/env.ts:34`, `src/lib/email/resend.ts:7`

```ts
// env.ts
RESEND_API_KEY: z.string().optional(),  // ← 起動時に未設定を許容

// resend.ts
const resend = new Resend(env.RESEND_API_KEY);  // ← undefined を渡す
```

- **問題**: 本番で API キー未設定のままデプロイしても起動は成功し、Stripe 決済完了メール送信時に Resend SDK 内部で `401 Unauthorized` などになる。サイレント失敗。
- **推奨修正案**: 本番では必須に切り替え、または明示的に `if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY required in production')`。`process.env.NODE_ENV === 'production'` 条件付き validation。
- **工数**: **S**

---

### 🟡 Medium

---

#### SEC-201: ゲスト注文番号への IDOR アクセス + エントロピー不足
- **カテゴリ**: IDOR
- **ファイル**:
  - `src/app/api/orders/by-no/[orderNo]/route.ts:89-98`
  - `supabase/migrations/00001_initial_schema.sql:69-77`

```sql
create or replace function public.generate_order_no()
returns text
language sql
stable
as $$
  select
    to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
$$;
```

- **問題**:
  - `user_id = null` のゲスト注文は誰でも orderNo を知れば閲覧可能（`by-no/[orderNo]/route.ts:89`）。注文番号 `YYYYMMDD-XXXXXXXX` のランダム部分は**32 bit (8 hex chars)** のみ。
  - 一般の推測耐性としては 4.3B 通りあり実質ブルートフォース不可だが、Stripe success URL 経由で Referer に漏れる可能性、ユーザーが SNS にスクショ共有する可能性などで漏洩リスク。漏洩した番号からは顧客氏名・注文内容・ピックアップ日時が閲覧可能。
- **推奨修正案**:
  - `substr(..., 1, 12)` 以上に増やす（48 bit 以上）
  - ゲスト注文時は別途 opaque token（`crypto.randomBytes(16)`）を `orders.lookup_token` 等に保持し、success URL には token を使う
  - `/complete?orderNo=...&token=...` スキーマに変更
- **工数**: **M**

---

#### DB-001: `generate_order_no()` が `stable` 宣言（正しくは `volatile`）
- **カテゴリ**: DB 整合性 / 潜在バグ
- **ファイル**: `supabase/migrations/00001_initial_schema.sql:72`

```sql
returns text
language sql
stable         -- ← 本来は volatile
```

- **問題**: `stable` 関数は PostgreSQL プランナによって「同一クエリ内で同じ引数なら同じ結果」と仮定される。`now()` と `gen_random_bytes()` は実体として volatile だが、stable 宣言により一部バッチ INSERT や CTE 経由で**同じ order_no が生成されて UNIQUE 制約違反**が発生する可能性。少なくとも意味論的に誤り。
- **推奨修正案**:
  ```sql
  create or replace function public.generate_order_no()
  returns text
  language sql
  volatile   -- ← 修正
  as $$ ... $$;
  ```
- **工数**: **S**（マイグレーション1本）

---

#### DB-002: `payments.stripe_session_id` / `idempotency_key` に UNIQUE なし
- **カテゴリ**: DB 制約
- **ファイル**:
  - `supabase/migrations/00001_initial_schema.sql:272` — `idempotency_key text,` (UNIQUE なし)
  - `supabase/migrations/00006_add_stripe_support.sql:7-13` — `stripe_session_id text` (index のみ、UNIQUE なし)

- **問題**: Stripe Webhook 処理 (`webhooks/stripe/route.ts:102-106`) が `.eq('stripe_session_id', sessionId).maybeSingle()` で単一行を期待しているが、制約がないため重複挿入された場合に `maybeSingle` がエラー（PGRST116）を返し、payment が見つからないエラーに落ちる可能性。
- **推奨修正案**:
  ```sql
  ALTER TABLE payments ADD CONSTRAINT payments_stripe_session_id_key UNIQUE (stripe_session_id);
  ALTER TABLE payments ADD CONSTRAINT payments_idempotency_key_key UNIQUE (idempotency_key);
  ```
- **工数**: **S**

---

#### SEC-202: `JsonLd` コンポーネントの `JSON.stringify` 生埋め込み
- **カテゴリ**: 潜在的 XSS（現状は静的データのみで実被害なし）
- **ファイル**: `src/components/JsonLd.tsx:5`

```tsx
dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
```

- **問題**: `JSON.stringify` は `</script>` や `<!--` を**エスケープしない**。`data` にユーザー制御文字列が入った場合、HTML パーサが `</script>` を読んだ時点でスクリプト終了→続く注入文字列を解釈しXSS。現状静的データのみだが、この実装パターンは将来の事故原因になる。
- **推奨修正案**:
  ```tsx
  const safe = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  ```
- **工数**: **S**

---

#### SEC-203: Upload パスがタイムスタンプのみで衝突・推測可能
- **カテゴリ**: ファイル上書き・情報漏洩
- **ファイル**: `src/lib/storage/upload.ts:38-39`

```ts
const timestamp = Date.now();
const path = `${productSlug}/${timestamp}.${ext}`;
```

- **問題**:
  - 同一ミリ秒の 2 アップロードで衝突（upsert: false のため、2つ目が失敗）
  - アップロード時刻が URL に露出
  - `productSlug` は admin が作成する値だが、`/` が含まれるとパストラバーサルっぽい挙動（slug は `/^[a-z0-9-]+$/` なので現実的にはOK）
- **推奨修正案**: `${productSlug}/${crypto.randomUUID()}.${ext}` に変更、拡張子は allowlist 化。
- **工数**: **S**

---

#### SEC-204: Admin ページのアクセス制御がクライアント側リダイレクトのみ
- **カテゴリ**: 多層防御
- **ファイル**: `src/app/admin/AdminShell.tsx:69-77`

- **問題**: サーバサイドで `/admin/*` の HTML レスポンスは全員に配信される（中身は空のスケルトンで、AdminContextで isAdmin を確認してからAPIをfetchするため実害はない）。ただし、API は `requireAdmin` で守られているので情報漏洩はないが、将来 SSR でユーザーデータを埋め込む場合に抜け穴になる。
- **推奨修正案**: Middleware で `/admin/*` 用のサーバサイドガード追加（Supabase セッション確認→admin_users 照合→未ログインなら302）。
- **工数**: **M**

---

#### PERF-001: Admin カレンダー API が毎月切替で全件取得
- **カテゴリ**: パフォーマンス
- **ファイル**: `src/app/admin/iitate-calendar/page.tsx:88-104`

- **問題**: `useEffect([month])` で毎月切替のたびに 2 本のリクエスト。キャッシュ機構（SWR / React Query）が未導入でユーザーが月を行き来すると毎回往復。大きな問題ではないが改善余地。
- **推奨修正案**: SWR 導入、もしくは fetched month をコンポーネント内でキャッシュ。
- **工数**: **M**（SWR 全体導入は別タスク）

---

#### PERF-002: TypeScript `target: ES2017` で旧構文出力
- **カテゴリ**: バンドルサイズ
- **ファイル**: `tsconfig.json:3`

- **問題**: `ES2017` ターゲットは Optional chaining / Nullish coalescing / async-await などを ES2017 互換ダウントランスパイルで出力しバンドル肥大化。Next.js 15 が対応する最新ブラウザ前提なら `ES2022` 相当が望ましい。
- **推奨修正案**: `"target": "ES2022"` に変更し、対応ブラウザ表を Netlify/Vercel の `browserslist` で定義。
- **工数**: **S**

---

#### SEC-205: 開発/プレビュー用ページが公開ルーティングに残置
- **カテゴリ**: アタックサーフェス
- **ファイル**:
  - `src/app/[locale]/home-preview/page.tsx`
  - `src/app/[locale]/taiwan-night-market-preview/page.tsx`
  - `src/app/[locale]/news/preview/page.tsx`

- **問題**: プレビュー系ページが認証なしで到達可能。内容次第では機密情報（未公開商品・下書きニュース等）の露出リスク。現状は `/news/preview` 内部の挙動を未確認だが、本番では `robots.ts` disallow に含まれていないため検索にもヒットし得る。
- **推奨修正案**: 公開不要ならルートごと削除。保持する場合は `robots.ts` で disallow + 認証ガード追加。
- **工数**: **S**

---

#### SEC-206: `src/lib/storage/upload.ts` が `console.error` で生ログ
- **カテゴリ**: ログ品質 / PII 漏洩リスク
- **ファイル**: `src/lib/storage/upload.ts:54, 72, 89, 95, 109, 122`

- **問題**: `secureLog` を使わず raw `console.error('Upload error:', error)`。Supabase error に storage path などは含まれるが PII は通常含まれないので実害は低い。一方で SREの観点では構造化ログに統一しないと検索が困難。
- **推奨修正案**: `secureLog('error', 'Upload failed', safeErrorLog(error))` に置換。
- **工数**: **S**

---

#### SEC-207: 入力バリデーション：zip / postal コードの文字列上限緩すぎ
- **カテゴリ**: 入力検証
- **ファイル**: `src/lib/validation/schemas.ts:28-29, 44, 51-55`

- **問題**: `phoneSchema` の `regex(/^0[0-9\-]{9,13}$/)` はハイフン含むので最大 14 文字。これは適切。しかし `nameSchema` 100 文字上限、`address1` 200 文字、`description` 2000文字など、多くのフィールドで絵文字や制御文字が混入するリスクを許容している。実害は小さいが、DB 挿入時に想定外のエンコーディングで入る可能性。
- **推奨修正案**: 制御文字・ゼロ幅文字を除去する `.transform()` を追加。
- **工数**: **S**

---

#### OBS-001: 観測性（Observability）が不足
- **カテゴリ**: 監視 / SRE
- **該当**: プロジェクト全体

- **問題**: Sentry / Datadog / New Relic などの APM / エラートラッキング統合がない。`secureLog` は `console.log` の JSON 出力に留まり、Vercel/Netlify ログには蓄積されるが、検索・アラートは弱い。
- **推奨修正案**:
  - Sentry 導入（React と Node.js 両方）で未捕捉例外とパフォーマンスを可視化
  - `/api/health` ヘルスチェックエンドポイント新設
  - 決済失敗・Webhook失敗を Slack/メールに通知
- **工数**: **M**

---

#### OBS-002: エラーバウンダリ / フォールバック UI なし
- **カテゴリ**: UX / 回復性
- **該当**: `src/app/[locale]/layout.tsx` 他

- **問題**: React 側で未捕捉エラーが起きた場合、`error.tsx` / `global-error.tsx` が見当たらない（確認要）。本番では画面が白くなる可能性。
- **推奨修正案**: Next.js App Router の `app/[locale]/error.tsx` 追加。Sentry に送信して画面ではフレンドリーメッセージ表示。
- **工数**: **S**

---

#### INFRA-001: CI/CD パイプラインが見えない
- **カテゴリ**: DevOps
- **該当**: `.github/workflows/` が存在しない、GitLab 等も未確認

- **問題**: デプロイが Vercel/Netlify 組み込みの Git 連携のみに見える。lint / test / typecheck の自動実行が強制されないため、崩れたコードがそのまま本番へ。
- **推奨修正案**:
  - GitHub Actions で PR 毎に `npm run lint && npm test && npx tsc --noEmit`
  - main ブランチへのマージ前にブロック
- **工数**: **S-M**

---

### 🔵 Low

---

#### SEC-301: `X-XSS-Protection: 1; mode=block` は非推奨ヘッダ
- **ファイル**: `next.config.ts:44`, `src/middleware.ts:15`
- **問題**: モダンブラウザはこのヘッダを無視。Chrome 78+ で削除。実害はないがノイズ。CSP で代替しているなら削除可。
- **工数**: **S**

---

#### SEC-302: `Permissions-Policy` が最小セット
- **ファイル**: `next.config.ts:60`
- **問題**: `camera=(), microphone=(), geolocation=()` のみ。`accelerometer`, `gyroscope`, `payment`, `usb`, `autoplay`, `fullscreen` 等もできれば追加。
- **工数**: **S**

---

#### SEC-303: `.mcp.json` のコミットは見送られているが、VERCEL_TOKEN の参照構造
- **ファイル**: `.mcp.json`, `.gitignore:4-5`
- **確認**: `.gitignore` で除外済み ✓。トークン自体は環境変数参照のみでハードコードなし ✓。履歴にも流出なし ✓（検証済み）。
- **工数**: 対応不要

---

#### DB-003: `customer_addresses` に `updated_at` がなく履歴性が弱い
- **ファイル**: `supabase/migrations/00008_add_customer_accounts.sql:12-26`
- **問題**: `created_at` のみ。UPDATE 時の最終更新日時が残らない。
- **工数**: **S**

---

#### DB-004: `orders` の `admin_note` に長さ制限なし
- **ファイル**: `supabase/migrations/00001_initial_schema.sql:168`
- **問題**: `admin_note text` は無制限。DB サイズ肥大の遠因。
- **工数**: **S**

---

#### DB-005: `news` の `content` に長さ制限はスキーマレベルで未設定
- **ファイル**: `supabase/migrations/00012_create_news_table.sql:5`
- **問題**: Zod で 50000 上限（`schemas.ts:196`）だが、DB レイヤでは `text` のまま。サービスロール経由で上限を超えるデータが直接書かれる余地（運用リスク）。
- **工数**: **S**

---

#### DB-006: `iitate_calendar_month_notes.year_month` CHECK 正規表現
- **ファイル**: `supabase/migrations/00014_create_iitate_calendar_tables.sql:25-26`
- **確認**: 正規表現でフォーマット検証は OK。ただし `01-13` など無効月もパスする（1月-12月の範囲チェックなし）。
- **推奨修正案**:
  ```sql
  CHECK (year_month ~ '^\d{4}-(0[1-9]|1[0-2])$')
  ```
- **工数**: **S**

---

#### PERF-301: Noto Sans JP を複数 weight 同時ロード
- **ファイル**: `src/app/admin/layout.tsx:5-10` (`weight: ["400", "500", "700"]`)
- **問題**: 3 weight は総重量大。管理画面なので現実的 impact は小さいが最適化余地。
- **工数**: **S**

---

#### LEGAL-001: 本プロジェクトの `.env.local` 中身は監査対象外
- **確認**: `.env.local` は git 管理外（`.gitignore` 適用）、履歴にも実キーの流出なし。

---

## 対応ロードマップ

### 🔴 公開ブロッカー（必須対応）

| ID | 内容 | 工数 |
|---|---|---|
| DEP-001 | `npm audit fix` 実行 + 回帰テスト | S |
| SEC-001 | 永続レート制限ストア（Upstash Redis 等）に移行 | M |
| SEC-002 | CSP を nonce ベースへ移行、`unsafe-eval` 除去 | M |
| SEC-003 | AdminShell の Hooks 順序修正 | S |
| SEC-107 | RESEND_API_KEY を本番必須に | S |
| DB-001 | `generate_order_no` を `volatile` に修正 | S |

### 🟠 公開後 1 週間以内

| ID | 内容 | 工数 |
|---|---|---|
| SEC-101 | `/api/auth/signup` に CSRF + RateLimit | S |
| SEC-102 | 管理者 API のエラーメッセージ統一 | S |
| SEC-103 | 商品並び替えのトランザクション化 | S-M |
| SEC-104 | アップロードの Magic byte 検証 | S |
| SEC-105 | Stripe Webhook のレート制限適用 | S |
| SEC-201 | order_no エントロピー増 + lookup_token 検討 | M |
| DB-002 | `payments` に UNIQUE 制約追加 | S |
| OBS-001 | Sentry / ヘルスチェック導入 | M |
| OBS-002 | error.tsx 追加 | S |
| INFRA-001 | GitHub Actions 追加 | S-M |

### 🟡 将来的改善

| ID | 内容 |
|---|---|
| SEC-202 | JsonLd の HTML エスケープ補強 |
| SEC-203 | Upload パスを UUID 化 |
| SEC-204 | Admin 用 Middleware サーバサイドガード |
| SEC-205 | プレビューページの削除 or 認証化 |
| SEC-206 | upload.ts の secureLog 置換 |
| SEC-207 | 制御文字除去 transform |
| PERF-001 | SWR 導入 |
| PERF-002 | TS target 更新 |
| DB-003 ~ DB-006 | DB 制約の強化 |
| LEGAL-001 | n/a |

---

## 参考資料
- Next.js CSP: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
- Vercel IP helpers: https://vercel.com/docs/edge-network/headers
- PostgreSQL Function Volatility: https://www.postgresql.org/docs/current/xfunc-volatility.html
- OWASP Top 10: https://owasp.org/Top10/
- `@upstash/ratelimit`: https://github.com/upstash/ratelimit

---

**監査範囲外（未確認）**:
- 本番環境で実際に設定されている環境変数値
- Supabase Auth の詳細レート制限設定・パスワードポリシー
- Netlify/Vercel 実デプロイ時のヘッダ挙動
- PII 取り扱い規程との整合性（個人情報保護法）
- 依存ライブラリの sub-dependency までの CVE（`package-lock.json` 全体は走査済みだが `npm audit` に依存）
- アクセシビリティ（WCAG 2.1 AA）— 今回の監査では深入りせず
- E2E テスト / カバレッジ詳細
