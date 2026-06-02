---
description: Next.jsページのSEO監査・実装（generateMetadata/JSON-LD/翻訳キー）
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, AskUserQuestion
---

# /seo [ページパス] — SEO監査 & 実装スキル

## 概要

`/seo <path>` でページのSEO状態を監査し、不足項目を実装する。

**例:**
```
/seo taiwan-night-market
/seo shop
/seo news
```

引数が省略された場合は `AskUserQuestion` でパスを確認する。

---

## Phase 1: 対象ファイル特定

以下のファイルを特定・読み込む（存在しない場合は「未作成」として記録）:

| 変数 | パス |
|------|------|
| `PAGE_TSX` | `src/app/[locale]/{path}/page.tsx` |
| `CLIENT_TSX` | `src/app/[locale]/{path}/*Client.tsx`（あれば） |
| `JA_JSON` | `messages/ja.json` の `metadata.{camelCase(path)}` セクション |
| `ZH_JSON` | `messages/zh-tw.json` の同セクション |
| `SITEMAP` | `src/app/sitemap.ts` |

> **camelCase変換ルール**: `taiwan-night-market` → `taiwanNightMarket`、`shop` → `shop`、`news` → `news`

---

## Phase 2: SEO監査（read-only）

各項目をチェックし、結果を記録する:

### チェックリスト

| # | 項目 | 確認方法 | ✅ / ✗ |
|---|------|----------|--------|
| 1 | `generateMetadata` 実装 | `PAGE_TSX` に `export async function generateMetadata` があるか |
| 2 | `title` 翻訳キー | `ja.json` に `metadata.{key}.title` があるか |
| 3 | `description` 翻訳キー | `ja.json` に `metadata.{key}.description` があるか |
| 4 | description文字数 | 80〜160文字の範囲か（ja/zh-tw両方） |
| 5 | canonical + hreflang | `alternates` に `ja`/`zh-TW`/`x-default` があるか |
| 6 | openGraph | `title`/`description`/`url`/`type` があるか |
| 7 | `JsonLd` コンポーネント | `PAGE_TSX` に `import { JsonLd } from '@/components/JsonLd'` があるか |
| 8 | BreadcrumbList | JSON-LDの中に `@type: BreadcrumbList` があるか |
| 9 | ページ固有スキーマ | 下記マッピング表に沿ったスキーマがあるか |
| 10 | h1タグ | `CLIENT_TSX` に `<h1` が1つあるか（Page Server Componentにある場合も可） |
| 11 | sitemap登録 | `SITEMAP` の `staticRoutes` に `/{path}` が含まれているか |
| 12 | zh-twメタデータ | `messages/zh-tw.json` に同じキーがあるか |

---

## Phase 3: 監査レポート出力

以下の形式でレポートを出力する:

```
## SEO監査レポート: /ja/{path}

| 項目 | 状態 | 詳細 |
|------|------|------|
| generateMetadata   | ✅ / ✗ | （実装済み / 未実装） |
| title              | ✅ / ✗ | "実際のtitle文字列" |
| description        | ✅ / ⚠️ / ✗ | N文字（80〜160文字推奨） |
| canonical/hreflang | ✅ / ✗ | ja/zh-TW/x-default |
| openGraph          | ✅ / ✗ | title/description/url/type |
| JsonLd             | ✅ / ✗ | コンポーネント使用あり/なし |
| BreadcrumbList     | ✅ / ✗ | N段階 / 未実装 |
| ページ固有スキーマ  | ✅ / ✗ | スキーマ種別 |
| h1タグ             | ✅ / ⚠️ / ✗ | 1つ / 0個 / 複数 |
| sitemap登録        | ✅ / ✗ | priority: N.N |
| zh-twメタデータ    | ✅ / ✗ | 実装済み / 未実装 |

**スコア: N/12**

### 修正が必要な項目
- （不足項目のリスト）
```

スコアが12/12の場合は「全項目クリア。修正不要。」で終了する。

---

## Phase 4: 修正実行（不足項目がある場合）

`AskUserQuestion` で確認:
> 「N個の不足項目が見つかりました。自動修正を実行しますか？実装内容を確認してから進めます。」

承認された場合のみ以下を実行。

### 4-1. 翻訳キー追加

`messages/ja.json` と `messages/zh-tw.json` の `metadata` セクションに不足キーを追加:

```json
"{camelCase(path)}": {
  "title": "【ページタイトル】| もも娘",
  "description": "【120文字程度の説明文】"
}
```

> ja.jsonの既存パターン（`metadata.shop`、`metadata.taiwanNightMarket`）を参考にトーン・形式を合わせる。
> zh-twは対応する繁体字中文に翻訳する。

### 4-2. generateMetadata 追加

`PAGE_TSX` に以下のパターンで追加（`shop/page.tsx` の実装を参考）:

```typescript
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://momomusume.com';

  return {
    title: t('{camelCase(path)}.title'),
    description: t('{camelCase(path)}.description'),
    alternates: {
      canonical: `${appUrl}/${locale}/{path}`,
      languages: {
        ja: `${appUrl}/ja/{path}`,
        'zh-TW': `${appUrl}/zh-tw/{path}`,
        'x-default': `${appUrl}/ja/{path}`,
      },
    },
    openGraph: {
      title: t('{camelCase(path)}.title'),
      description: t('{camelCase(path)}.description'),
      url: `${appUrl}/${locale}/{path}`,
      type: 'website',
    },
  };
}
```

### 4-3. JSON-LD 追加

ページパスに応じたスキーマを `PAGE_TSX` に追加（`taiwan-night-market/page.tsx` を参考）。

**パス別スキーママッピング:**

| パス | 追加スキーマ |
|------|------------|
| `taiwan-night-market` | Article + ItemList + BreadcrumbList |
| `shop` | BreadcrumbList（商品一覧はShopClientで動的） |
| `shop/[slug]` | Product + BreadcrumbList |
| `news` | BreadcrumbList |
| `news/[slug]` | Article + BreadcrumbList |
| その他 | BreadcrumbList のみ |

**BreadcrumbList の基本パターン:**

```typescript
const breadcrumbData = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: locale === 'ja' ? 'ホーム' : '首頁',
      item: `${appUrl}/${locale}`,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: locale === 'ja' ? '{ページ名}' : '{繁体字ページ名}',
      item: `${appUrl}/${locale}/{path}`,
    },
  ],
};
```

JSXでの使用:

```tsx
import { JsonLd } from '@/components/JsonLd';

// return内:
<>
  <JsonLd data={breadcrumbData} />
  {/* 他のスキーマ */}
  <YourClient ... />
</>
```

### 4-4. sitemap.ts 追加

`staticRoutes` 配列に不足エントリを追加:

```typescript
{ path: '/{path}', changeFrequency: 'weekly', priority: 0.7 },
```

> priority の目安: トップページ1.0、ショップ0.9、特設ページ0.8、一般0.7、法的0.3

---

## Phase 5: 修正後確認

修正実装後:

1. 修正したファイルを再読み込みして変更を確認
2. 監査スコアを再計算して出力
3. ビルドエラー確認が必要な場合は `npm run build` を実行するか提案する

---

## 注意事項

- **翻訳文は実際のページ内容を反映すること**（汎用的なコピペは避ける）
- **description は80〜160文字を目標**（日本語は80〜120文字、中文は70〜100文字が目安）
- **修正は一度に1ファイルずつ確認しながら進める**
- **既存の`generateMetadata`がある場合は上書きせず、不足項目のみ追加する**
- **`AskUserQuestion` を使って修正前に必ずユーザー確認を取る**
