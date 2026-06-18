'use client';

import { useState, useEffect, useRef } from 'react';
import { Link } from '@/i18n/navigation';
import { Box, Container, Typography, Chip, Divider, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslations, useLocale } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import TaiwanNightMarketHeader from '../../taiwan-night-market/components/TaiwanNightMarketHeader';
import TaiwanNightMarketFooter from '../../taiwan-night-market/components/TaiwanNightMarketFooter';
import type { News } from '@/types/database';
import { formatNewsDate } from '@/lib/utils/format';
import {
  getLocalizedNewsTitle,
  getLocalizedNewsContent,
  getLocalizedNewsCategory,
} from '@/lib/utils/localize-news';
import styles from '../news.module.css';

const gold = '#fbc02d';
const dividerColor = 'rgba(251, 192, 45, 0.2)';
// 本文画像は自前Storageに配置（wikimediaのthumbはホットリンク制限で400になるため）
const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/night-market`;

/**
 * 本文中の画像。画像が存在しない場合（Storage未登録・リンク切れ等）は
 * 壊れたアイコンを出さずに非表示にする。
 * SSR時点で既に読込失敗した画像は onError が発火しないため、マウント時に
 * naturalWidth で判定する。
 */
function NewsContentImage({ src, alt }: { src?: string; alt: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth === 0) {
      setHidden(true);
    }
  }, []);

  if (hidden || !src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      onError={() => setHidden(true)}
      style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }}
    />
  );
}

interface Props {
  news: News;
}

export default function NewsDetailClient({ news }: Props) {
  const t = useTranslations('news');
  const locale = useLocale();
  const title = getLocalizedNewsTitle(news, locale);
  const content = getLocalizedNewsContent(news, locale);
  const category = getLocalizedNewsCategory(news.category, locale);

  return (
    <>
      <TaiwanNightMarketHeader />
      <div className={styles.pageContent}>
        {/* Hero */}
        <Box className={styles.detailHero}>
          <Container maxWidth="md">
            <Button
              component={Link}
              href="/news"
              startIcon={<ArrowBackIcon />}
              sx={{
                mb: 3,
                color: gold,
                '&:hover': { color: '#ffe082', backgroundColor: 'rgba(251,192,45,0.08)' },
              }}
            >
              {t('backToList')}
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip
                label={category}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: 'rgba(255,255,255,0.55)',
                  borderRadius: 0,
                  fontSize: '0.75rem',
                }}
              />
              <Typography variant="body2" sx={{ color: gold, fontWeight: 600 }}>
                {formatNewsDate(news.published_at)}
              </Typography>
            </Box>

            <Typography component="h1" className={styles.detailTitle}>
              {title}
            </Typography>
          </Container>
        </Box>

        {/* Content */}
        <Box className={styles.contentSection}>
          <Container maxWidth="md">
            <Divider sx={{ mb: 4, borderColor: dividerColor }} />

            {content ? (
              <div className={styles.markdownContent}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    img: ({ src, alt }) => {
                      // wikimediaのホットリンクは400になるため、本文画像は記事slugの自前Storage画像に差し替え
                      const finalSrc =
                        typeof src === 'string' && src.includes('wikimedia.org')
                          ? `${STORAGE_BASE}/${news.slug}.jpg`
                          : (src as string | undefined);
                      return <NewsContentImage src={finalSrc} alt={alt ?? ''} />;
                    },
                  }}
                >{content}</ReactMarkdown>
              </div>
            ) : (
              <Typography sx={{ color: 'rgba(255,255,255,0.4)' }}>{t('noContent')}</Typography>
            )}
          </Container>
        </Box>
      </div>
      <TaiwanNightMarketFooter />
    </>
  );
}
