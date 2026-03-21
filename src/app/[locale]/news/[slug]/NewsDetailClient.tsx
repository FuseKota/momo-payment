'use client';

import { Link } from '@/i18n/navigation';
import { Box, Container, Typography, Chip, Divider, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import { Layout } from '@/components/common';
import type { News } from '@/types/database';
import { formatNewsDate } from '@/lib/utils/format';
import styles from '../news.module.css';

const gold = '#fbc02d';
const dividerColor = 'rgba(251, 192, 45, 0.2)';

interface Props {
  news: News;
}

export default function NewsDetailClient({ news }: Props) {
  const t = useTranslations('news');

  return (
    <Layout>
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
                label={news.category}
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
              {news.title}
            </Typography>
          </Container>
        </Box>

        {/* Content */}
        <Box className={styles.contentSection}>
          <Container maxWidth="md">
            <Divider sx={{ mb: 4, borderColor: dividerColor }} />

            {news.content ? (
              <div className={styles.markdownContent}>
                <ReactMarkdown>{news.content}</ReactMarkdown>
              </div>
            ) : (
              <Typography sx={{ color: 'rgba(255,255,255,0.4)' }}>{t('noContent')}</Typography>
            )}
          </Container>
        </Box>
      </div>
    </Layout>
  );
}
