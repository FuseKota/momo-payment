// 構造化データ（JSON-LD / schema.org）の共通ビルダー。
//
// もも娘の「事業者（Organization）」「サイト（WebSite）」「店舗（LocalBusiness）」を
// 単一ソースで定義し、各ページの <JsonLd /> から参照する。
// Google が推奨する @id 相互参照方式を採用し、Organization を一意の @id で表現することで
// Article の publisher / Product の seller などから同一エンティティとして解決させる。
//
// 実データの出典:
// - 事業者情報: messages/ja.json の legal.* （特定商取引法表記）
// - SNS（sameAs）: src/components/common/Header.tsx 等のソーシャルリンク
// - ロゴ: public/images/momo-main-logo.png

import type { News, Product, ProductWithVariants } from '@/types/database';
import { getLocalizedName, getLocalizedDescription } from '@/lib/utils/localize-product';
import { getLocalizedNewsTitle, getLocalizedNewsExcerpt } from '@/lib/utils/localize-news';
import { localeUrl } from './locale-url';

/** SNS 公式アカウント（Organization.sameAs に使用。ナレッジパネル/エンティティ解決を補助） */
const SOCIAL_LINKS = [
  'https://www.instagram.com/momomusume_fukushima_official/',
  'https://x.com/momomusume_jp',
  'https://www.youtube.com/@%E7%A6%8F%E5%B3%B6%E3%82%82%E3%82%82%E5%A8%98%E5%85%AC%E5%BC%8F',
];

/** ロゴ画像の public パス（appUrl と結合して絶対 URL 化） */
const LOGO_PATH = '/images/momo-main-logo.png';

/** 事業者法人名（特商法表記より） */
const LEGAL_NAME = '株式会社サクラ・シスターズ';

/** 問い合わせメール（特商法表記より） */
const CONTACT_EMAIL = 'info@sakura-sisters.com';

type Trail = Array<{ name: string; path: string }>;

/** ブランド名（taiwan-night-market の既存 JSON-LD と表記を統一） */
function brandName(locale: string): string {
  if (locale === 'zh-tw') return '桃娘';
  if (locale === 'en') return 'Momomusume';
  return 'もも娘';
}

/** WebSite.name 等で使うサイト正式名称 */
function siteName(locale: string): string {
  if (locale === 'zh-tw') return '福島桃娘商品網站';
  if (locale === 'en') return 'Fukushima Momomusume Shop';
  return '福島もも娘物販サイト';
}

/** JSON-LD inLanguage 用の言語タグ */
function inLanguageTag(locale: string): string {
  if (locale === 'zh-tw') return 'zh-Hant-TW';
  if (locale === 'en') return 'en';
  return 'ja';
}

/** Organization の安定した @id（ページをまたいで同一エンティティとして参照する） */
function orgId(appUrl: string): string {
  return `${appUrl}/#organization`;
}

function logoUrl(appUrl: string): string {
  return `${appUrl}${LOGO_PATH}`;
}

/** 事業者所在地（特商法表記より。Organization / LocalBusiness で共有。ローカル検索向けに飯舘村を明示） */
function postalAddress(locale: string) {
  return {
    '@type': 'PostalAddress',
    postalCode: '960-1721',
    addressRegion: locale === 'zh-tw' ? '福島縣' : locale === 'en' ? 'Fukushima' : '福島県',
    addressLocality: '相馬郡飯舘村',
    streetAddress: '飯樋字原361番地',
    addressCountry: 'JP',
  };
}

/**
 * 相対パスを絶対 URL に正規化する。
 * JSON-LD の image/url は絶対 URL が推奨（OG と異なり metadataBase の補完が効かない）。
 * Supabase Storage 等の絶対 URL はそのまま返す。
 */
function toAbsoluteUrl(appUrl: string, url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${appUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * 埋め込み用の Organization 参照（@context を持たない圧縮版）。
 * Article.publisher / Product.seller など、ページ内の他スキーマから参照する。
 * publisher には logo（ImageObject）が必須のため含める。
 */
function organizationRef(appUrl: string, locale: string) {
  return {
    '@type': 'Organization',
    '@id': orgId(appUrl),
    name: brandName(locale),
    url: localeUrl(appUrl, locale),
    logo: {
      '@type': 'ImageObject',
      url: logoUrl(appUrl),
    },
  };
}

/** トップページ用: Organization（事業者エンティティの正規定義） */
export function organizationSchema(appUrl: string, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': orgId(appUrl),
    name: brandName(locale),
    legalName: LEGAL_NAME,
    url: localeUrl(appUrl, locale),
    logo: {
      '@type': 'ImageObject',
      url: logoUrl(appUrl),
    },
    email: CONTACT_EMAIL,
    address: postalAddress(locale),
    sameAs: SOCIAL_LINKS,
  };
}

/** トップページ用: WebSite（サイトエンティティ。発行者は Organization を参照） */
export function websiteSchema(appUrl: string, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${appUrl}/#website`,
    name: siteName(locale),
    url: localeUrl(appUrl, locale),
    inLanguage: inLanguageTag(locale),
    publisher: { '@id': orgId(appUrl) },
  };
}

/**
 * トップページ用: LocalBusiness（飯舘村の実店舗・キッチンカー）。
 * ローカル検索/地図向け。電話番号は特商法表記が未確定（プレースホルダ）のため
 * 意図的に省略している（実番号確定後に telephone を追加すること）。
 */
export function localBusinessSchema(appUrl: string, locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${appUrl}/#localbusiness`,
    name: brandName(locale),
    image: logoUrl(appUrl),
    url: localeUrl(appUrl, locale),
    servesCuisine: locale === 'zh-tw' ? '台灣料理' : locale === 'en' ? 'Taiwanese Cuisine' : '台湾料理',
    priceRange: '¥¥',
    email: CONTACT_EMAIL,
    address: postalAddress(locale),
    parentOrganization: { '@id': orgId(appUrl) },
  };
}

/** パンくず（BreadcrumbList）。trail は [{ name, path }] を順に渡す（path は locale 以下の相対パス） */
export function breadcrumbSchema(appUrl: string, locale: string, trail: Trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: localeUrl(appUrl, locale, item.path),
    })),
  };
}

/** 在庫判定（ProductDetailClient と同じ規約: stock_qty === null は無制限=在庫あり） */
export function isInStock(product: Pick<Product, 'has_variants' | 'stock_qty'> & {
  variants?: ProductVariantStock[];
}): boolean {
  if (product.has_variants && Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.some(
      (v) => v.is_active && (v.stock_qty === null || v.stock_qty > 0)
    );
  }
  return product.stock_qty === null || product.stock_qty > 0;
}

type ProductVariantStock = {
  is_active: boolean;
  stock_qty: number | null;
  price_yen: number | null;
};

/** 商品詳細用: Product（offers に価格・在庫・販売者。バリアントがあれば AggregateOffer） */
export function productSchema(
  appUrl: string,
  locale: string,
  product: ProductWithVariants
) {
  const name = getLocalizedName(product, locale);
  const description = getLocalizedDescription(product, locale) || name;
  const url = localeUrl(appUrl, locale, `/shop/${product.slug}`);

  // 画像（メイン + ギャラリーを絶対 URL 化して重複排除）
  const images: string[] = [];
  if (product.image_url) images.push(toAbsoluteUrl(appUrl, product.image_url));
  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (!img) continue;
      const abs = toAbsoluteUrl(appUrl, img);
      if (!images.includes(abs)) images.push(abs);
    }
  }

  const availability = isInStock(product)
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  // 価格レンジ（有効バリアントの価格、なければ商品本体の価格）
  const activeVariants = (product.variants || []).filter((v) => v.is_active);
  const prices = activeVariants.length
    ? activeVariants.map((v) => v.price_yen ?? product.price_yen)
    : [product.price_yen];
  const low = Math.min(...prices);
  const high = Math.max(...prices);

  const offers =
    low === high
      ? {
          '@type': 'Offer',
          url,
          priceCurrency: 'JPY',
          price: low,
          availability,
          itemCondition: 'https://schema.org/NewCondition',
          seller: organizationRef(appUrl, locale),
        }
      : {
          '@type': 'AggregateOffer',
          url,
          priceCurrency: 'JPY',
          lowPrice: low,
          highPrice: high,
          offerCount: prices.length,
          availability,
          seller: organizationRef(appUrl, locale),
        };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url,
    sku: product.slug,
    ...(images.length ? { image: images } : {}),
    brand: { '@type': 'Brand', name: brandName(locale) },
    offers,
  };
}

/** ショップ一覧用: ItemList（掲載商品の並び順を構造化） */
export function shopItemListSchema(appUrl: string, locale: string, products: Product[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: localeUrl(appUrl, locale, `/shop/${p.slug}`),
      name: getLocalizedName(p, locale),
    })),
  };
}

/**
 * ニュース詳細用: Article。
 * ニュースは画像カラムを持たないため image はロゴをフォールバックとして使用。
 * author / publisher は Organization を参照（@id 共有）。
 */
export function articleSchema(appUrl: string, locale: string, news: News) {
  const published = news.published_at || news.created_at;
  const headline = getLocalizedNewsTitle(news, locale);
  const description = getLocalizedNewsExcerpt(news, locale) || headline;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image: logoUrl(appUrl),
    datePublished: published,
    dateModified: news.updated_at || published,
    inLanguage: inLanguageTag(locale),
    author: organizationRef(appUrl, locale),
    publisher: organizationRef(appUrl, locale),
    mainEntityOfPage: localeUrl(appUrl, locale, `/news/${news.slug}`),
  };
}
