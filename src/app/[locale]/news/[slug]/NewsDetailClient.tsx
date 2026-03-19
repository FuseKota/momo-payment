'use client';

import { Link } from '@/i18n/navigation';
import { Box, Container, Typography, Chip, Divider, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslations } from 'next-intl';
import { Layout } from '@/components/common';
import type { News } from '@/types/database';
import { formatNewsDate } from '@/lib/utils/format';

interface Props {
  news: News;
}

export default function NewsDetailClient({ news }: Props) {
  const t = useTranslations('news');

  return (
    <Layout>
      <Box sx={{ background: 'linear-gradient(180deg, #FFF0F3 0%, #FFFBFC 100%)', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          <Button
            component={Link}
            href="/news"
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 3, color: 'text.secondary' }}
          >
            {t('backToList')}
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Chip
              label={news.category}
              size="small"
              variant="outlined"
              sx={{
                borderColor: 'text.secondary',
                color: 'text.secondary',
                borderRadius: 0,
                fontSize: '0.75rem',
              }}
            />
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
              {formatNewsDate(news.published_at)}
            </Typography>
          </Box>

          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.5 }}
          >
            {news.title}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Divider sx={{ mb: 4, borderColor: 'rgba(255, 102, 128, 0.2)' }} />

        {news.content ? (
          <Typography
            variant="body1"
            sx={{
              lineHeight: 2,
              color: 'text.primary',
              whiteSpace: 'pre-wrap',
            }}
          >
            {news.content}
          </Typography>
        ) : (
          <Typography color="text.secondary">{t('noContent')}</Typography>
        )}
      </Container>
    </Layout>
  );
}
