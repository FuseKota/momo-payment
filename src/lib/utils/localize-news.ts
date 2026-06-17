import type { News } from '@/types/database';

/**
 * ニュースのロケール別表示ヘルパー
 * zh-tw 用カラムが空の場合は日本語（原文）にフォールバックする
 */

export function getLocalizedNewsTitle(
  news: Pick<News, 'title' | 'title_zh_tw'>,
  locale: string
): string {
  if (locale === 'zh-tw' && news.title_zh_tw) return news.title_zh_tw;
  return news.title;
}

export function getLocalizedNewsExcerpt(
  news: Pick<News, 'excerpt' | 'excerpt_zh_tw'>,
  locale: string
): string | null {
  if (locale === 'zh-tw' && news.excerpt_zh_tw) return news.excerpt_zh_tw;
  return news.excerpt;
}

export function getLocalizedNewsContent(
  news: Pick<News, 'content' | 'content_zh_tw'>,
  locale: string
): string | null {
  if (locale === 'zh-tw' && news.content_zh_tw) return news.content_zh_tw;
  return news.content;
}

/**
 * カテゴリ名（固定選択肢）の繁体字訳。
 * admin の NEWS_CATEGORIES と対応。未知のカテゴリは原文を返す。
 */
const NEWS_CATEGORY_ZH_TW: Record<string, string> = {
  福島もも娘: '福島桃娘',
  日本国内台湾夜市: '日本國內台灣夜市',
  本場台湾夜市: '正宗台灣夜市',
  お知らせ: '公告',
};

export function getLocalizedNewsCategory(category: string, locale: string): string {
  if (locale === 'zh-tw') return NEWS_CATEGORY_ZH_TW[category] ?? category;
  return category;
}
