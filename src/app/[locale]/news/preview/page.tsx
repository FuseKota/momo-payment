import NewsListClient from '../NewsListClient';
import type { News } from '@/types/database';

const mockNews: News[] = [
  {
    id: '1',
    title: '🍑飯館村に台湾夜市出現！！🍑',
    excerpt: '📅 4月1日〜オープン！！ゲストハウス「cocoda」にて台湾夜市が開催されます👏✨ 台湾夜市では、魯肉飯や台湾スイーツが楽しめます。',
    content: null,
    category: '福島もも娘',
    slug: 'iitate-taiwan-night-market',
    is_published: true,
    published_at: '2026-03-15T00:00:00Z',
    created_at: '2026-03-15T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  },
  {
    id: '2',
    title: '🍑仙台スクールオブミュージック＆ダンス専門学校卒業・進級制作…',
    excerpt: '📅 2月18日（水）マコの母校、仙台スクールオブミュージック＆ダンス専門学校の卒業・進級制作展に 福島もも娘…',
    content: null,
    category: '福島もも娘',
    slug: 'sendai-school-event',
    is_published: true,
    published_at: '2026-02-10T00:00:00Z',
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  },
  {
    id: '3',
    title: '🍑 福島もも娘 サポーター募集 🍑',
    excerpt: '🍑 福島もも娘 サポーター募集 🍑 福島もも娘 from Taiwan は、福島と台湾をつなぐ「観光交流大使」として活動しています。',
    content: null,
    category: '福島もも娘',
    slug: 'supporter-recruitment',
    is_published: true,
    published_at: '2026-01-22T00:00:00Z',
    created_at: '2026-01-22T00:00:00Z',
    updated_at: '2026-01-22T00:00:00Z',
  },
];

export default function NewsPreviewPage() {
  return <NewsListClient items={mockNews} />;
}
