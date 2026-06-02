# パフォーマンス計測レポート

- **対象**: 本番環境 `https://taiwanyoichi-momomusume.com`
- **計測日**: 2026-06-02
- **ツール**: Chrome DevTools (MCP) パフォーマンストレース（ナビゲーション・リロード計測）
- **プロファイル**: Desktop（スロットリングなし）/ Mobile（390×844・CPU 4倍遅延・Slow 4G ≒ 実機相当）
- **注意点**:
  - Cloudflare CDN のキャッシュが温まった状態での計測。実初回訪問（コールドキャッシュ）はやや遅くなる。
  - CrUX 実ユーザーフィールドデータは「データなし」（トラフィック蓄積前）。
  - 各ページ単発計測のため数値は参考値。

---

## 1. 計測結果

### Desktop（スロットリングなし）

| ページ | LCP | CLS | 判定 |
|---|---|---|---|
| トップ `/ja` | 981 ms | 0.00 | ✅ 良好 |
| 商品一覧 `/shop` | 1,456 ms | 0.00 | ⚠️ Load delay 1,310 ms |
| 商品詳細 `/shop/[slug]` | 1,522 ms | **0.46** | ❌ CLS 不良 |
| カート `/cart`（空） | 390 ms | 0.00 | ✅ 良好 |

### Mobile（CPU 4倍 + Slow 4G、実機相当）

| ページ | LCP | CLS | 判定 |
|---|---|---|---|
| トップ | 1,496 ms | 0.00 | ✅ 良好 |
| 商品一覧 | **2,992 ms** | 0.00 | ⚠️ 要改善 |
| 商品詳細 | **3,149 ms** | 0.00 ※ | ⚠️ 要改善 |

> **基準**: LCP 良好 < 2.5s / 要改善 2.5–4s / 不良 > 4s、CLS 良好 < 0.1 / 要改善 0.1–0.25 / 不良 > 0.25
> ※ 商品詳細の CLS は計測ごとに変動（Desktop 0.46 / Mobile 0.00）。スピナー差し替えのタイミング依存で**潜在的な不良**。

### LCP 内訳（モバイル）

| ページ | TTFB | Load delay | Render delay | LCP |
|---|---|---|---|---|
| トップ | 399 ms | – | 1,097 ms | 1,496 ms |
| 商品一覧 | 110 ms | **2,639 ms** | 240 ms | 2,992 ms |
| 商品詳細 | 102 ms | **2,779 ms** | 264 ms | 3,149 ms |

商品一覧・詳細の LCP は **Load delay（LCP画像の発見遅延）が支配的**。

---

## 2. 根本原因（ソースコードで確認済み）

`shop` と `shop/[slug]` が **クライアント側でデータ取得**していることが全問題の元凶。

```
src/app/[locale]/shop/ShopClient.tsx
  useEffect(() => { ... await fetch('/api/products?mode=shipping') ... })

src/app/[locale]/shop/[slug]/ProductDetailClient.tsx
  useEffect(() => { ... await fetch(`/api/products?slug=${slug}`) ... })
  if (isLoading) return <CircularProgress />  // 読込中スピナー
```

`page.tsx` は metadata のみ生成し、商品データと画像はブラウザでハイドレーション後に fetch している。これにより：

1. **LCP 画像が初期 HTML に存在しない**
   DevTools `LCPDiscovery` の判定:
   - `discoverable in initial document: FAILED`
   - `fetchpriority=high: FAILED`
   画像リクエスト開始までの「Load delay」が **Desktop 1.3秒 / Mobile 2.6〜2.8秒** を占める。

2. **商品詳細の CLS 0.46**
   `<CircularProgress />`（`stroke-dasharray` アニメ）→ コンテンツ差し替えで大きなレイアウトシフト。
   DevTools `CLSCulprits` がこの非合成アニメを原因として特定。

3. **商品画像が `next/image` 未使用**
   MUI `CardMedia component="img"` / `Box component="img"`（生 `<img>`）で Supabase Storage の生 JPEG を配信。
   WebP/AVIF 変換・レスポンシブ srcset・自動 preload なし。`cache-control: max-age=3600`（1時間）と短め。

4. **トップで woff2 フォントが約 50 ファイル**
   Noto Sans JP のサブセット分割チャンク（CJK フォントの性質上、unicode-range で分割）。
   HTTP/2 多重化・非レンダーブロッキング・オンデマンド DL で `display: swap` のため CLS=0。影響は限定的。

---

## 3. 改善提案（効果順）

### P1. shop / 商品詳細をサーバー側データ取得へ（最大の効果）

`useEffect` の `fetch` を廃止し、Server Component（`page.tsx`）で Supabase から取得して props で渡す。
商品詳細は既に `generateStaticParams` があり SSG/ISR 化が容易。
→ 画像が初期 HTML に入り、**Load delay 1.3〜2.8秒がほぼ消滅**。モバイル LCP が約 3秒 → 1秒前後に短縮見込み。

### P2. 商品詳細の CLS 解消

SSR 化でスピナーが不要に。ローディングを残す場合も画像・本文に `aspect-ratio` で固定領域を確保。

### P3. `next/image` へ移行

商品画像を MUI `<img>` から `next/image` に置換し、LCP 画像（先頭カード／詳細メイン）に `priority` を付与、`sizes` を設定。
`next.config.ts` の `images.remotePatterns` には既に `*.supabase.co` 登録済み。WebP/AVIF + レスポンシブ + 自動 preload が有効化。

### P4. フォント最適化

調査の結果、次の構造的な問題が判明した:

- MUI テーマ（`src/lib/mui/theme.ts`）と CSS Module は **リテラル名 `'Noto Sans JP'` / `'Noto Serif JP'`** を参照している。
- 一方 next/font が生成する実フォントは**ハッシュ化されたファミリー名**で、`var(--font-noto-sans-jp)` 経由でしか参照できない。この CSS 変数を**誰も使っていない**（`globals.css` の body は `Arial, Helvetica, sans-serif`）。
- 結果として next/font で読み込んだ Noto は **`preload: true`（デフォルト）で eager に読み込まれるが、実描画はシステムフォント（Hiragino/Meiryo 等）へフォールバック**している。トップの約 50 woff2 は概ね**使われない先読み**。

→ CJK フォントはサブセット先読みが効かないため、Next.js 公式も `preload: false` を推奨。これを適用し無駄な先読みを停止する（`display: swap` 済みのため表示への影響なし）。

> **フォント正式適用（対応済み 2026-06-02）**: 共有変数 `--app-font-sans` / `--app-font-serif` にロケール別フォント（ja: Noto Sans/Serif JP、zh-tw: Noto Sans/Serif TC）を割り当て、MUI テーマ・`globals.css`・CSS Module を `var(--app-font-*)` 参照に統一。Serif（Noto Serif JP/TC）も next/font で新規ロードし、`news.module.css` の Google Fonts `@import`（外部・レンダーブロッキング）を撤去。これに伴い不要となった CSP の `fonts.googleapis.com` / `fonts.gstatic.com` 許可も削除。
>
> ※ ローカルでの本番ビルド完走には別機能（Google カレンダー連携）の `GOOGLE_CALENDAR_*` 本番必須 env が必要。フォント変更自体は `✓ Compiled successfully` と生成 CSS（`--app-font-sans/serif` 定義・Noto Serif の @font-face）で検証済み。

---

## 4. 実装記録

本レポートの提案に基づき、以下を実装した（2026-06-02）。

- **P1**: `src/lib/api/product-queries.ts` を新設し、`getShippingProducts()` / `getProductBySlug()` をサーバー側で実行。
  `shop/page.tsx`・`shop/[slug]/page.tsx` を async 化して props で初期データを供給。
  `ShopClient` / `ProductDetailClient` の `useEffect` フェッチを撤去。
- **P2**: 商品詳細の読込スピナーを撤去（SSR 化により不要）。画像領域を固定。
- **P3**: `ProductCard` と商品詳細の画像を `next/image` 化。LCP 画像へ `priority`・`sizes` を付与。
- **P4**: CJK フォント（Noto Sans JP/TC）に `preload: false` を設定し、無駄な eager 先読みを停止（`[locale]/layout.tsx`・`admin/layout.tsx`）。フォント名のリテラル不一致は別タスクとして文書化。

> 実装後は `npm run build` でのプリレンダリングにより、商品一覧・詳細の LCP 画像が初期 HTML に含まれることを確認すること。

### 変更ファイル一覧

| ファイル | 変更 |
|---|---|
| `src/lib/api/product-queries.ts` | 新設。`getShippingProducts()` / `getProductBySlug()` |
| `src/app/[locale]/shop/page.tsx` | async 化・サーバー側取得・`revalidate=60` |
| `src/app/[locale]/shop/ShopClient.tsx` | `initialProducts` prop 受け取り、`useEffect` フェッチ撤去 |
| `src/app/[locale]/shop/[slug]/page.tsx` | サーバー側で商品取得し props 供給・`revalidate=60` |
| `src/app/[locale]/shop/[slug]/ProductDetailClient.tsx` | `product` prop 受け取り、フェッチ・スピナー撤去、画像 next/image 化 |
| `src/components/common/ProductCard.tsx` | 画像を next/image 化、`priority` prop 追加 |
| `src/app/[locale]/layout.tsx` / `src/app/admin/layout.tsx` | フォント `preload: false` |

### 検証結果（`npm run build` 出力で確認）

- `npx tsc --noEmit`: エラーなし
- `npm run build`: 成功。`/[locale]/shop` `/[locale]/shop/[slug]` が **SSG/ISR（revalidate 60s）** としてプリレンダリング。
- `npx vitest run`: **135 件すべて pass**
- プリレンダリング HTML（`.next/server/app/ja/shop/rurohan-frozen.html`）で確認:
  - LCP 画像が初期 HTML に `/_next/image`（WebP・レスポンシブ srcSet）で出力され、`<head>` に `<link rel="preload" as="image">` を生成 → **発見遅延（Load delay）解消**。
  - メイン画像は eager（`loading="lazy"` なし）、サムネイルは `loading="lazy"`。
  - `CircularProgress` スピナーは **0 個** → **CLS の原因が消滅**。
  - shop 一覧 HTML は先頭 3 商品画像の preload を生成（`priority`）。
  - トップ HTML のフォント preload リンクは **0 個**（`preload: false` 反映）。

> **未計測の最終確認**: 数値（LCP/CLS）の実測は本番デプロイ後に再計測して反映すること。コードレベルでは上記のとおり、Load delay と CLS の原因が解消済み。
