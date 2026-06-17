import type { News } from '@/types/database';

/**
 * ニュースのロケール別表示ヘルパー
 * 各言語用カラムが空の場合は日本語（原文）にフォールバックする
 */

export function getLocalizedNewsTitle(
  news: Pick<News, 'title' | 'title_zh_tw' | 'title_en'>,
  locale: string
): string {
  if (locale === 'zh-tw' && news.title_zh_tw) return news.title_zh_tw;
  if (locale === 'en' && news.title_en) return news.title_en;
  return news.title;
}

export function getLocalizedNewsExcerpt(
  news: Pick<News, 'excerpt' | 'excerpt_zh_tw' | 'excerpt_en'>,
  locale: string
): string | null {
  if (locale === 'zh-tw' && news.excerpt_zh_tw) return news.excerpt_zh_tw;
  if (locale === 'en' && news.excerpt_en) return news.excerpt_en;
  return news.excerpt;
}

export function getLocalizedNewsContent(
  news: Pick<News, 'content' | 'content_zh_tw' | 'content_en'>,
  locale: string
): string | null {
  if (locale === 'zh-tw' && news.content_zh_tw) return news.content_zh_tw;
  if (locale === 'en' && news.content_en) return news.content_en;
  return news.content;
}

/**
 * カテゴリ名（固定選択肢）のロケール別訳。admin の NEWS_CATEGORIES と対応。
 * 未知のカテゴリは原文を返す。
 */
const NEWS_CATEGORY_ZH_TW: Record<string, string> = {
  福島もも娘: '福島桃娘',
  日本国内台湾夜市: '日本國內台灣夜市',
  本場台湾夜市: '正宗台灣夜市',
  お知らせ: '公告',
};

const NEWS_CATEGORY_EN: Record<string, string> = {
  福島もも娘: 'Fukushima Momomusume',
  日本国内台湾夜市: 'Taiwan Night Markets in Japan',
  本場台湾夜市: 'Authentic Taiwan Night Markets',
  お知らせ: 'Announcements',
};

export function getLocalizedNewsCategory(category: string, locale: string): string {
  if (locale === 'zh-tw') return NEWS_CATEGORY_ZH_TW[category] ?? category;
  if (locale === 'en') return NEWS_CATEGORY_EN[category] ?? category;
  return category;
}
