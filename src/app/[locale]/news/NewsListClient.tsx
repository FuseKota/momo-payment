'use client';

import { Link } from '@/i18n/navigation';
import { Box, Container, Typography, Divider, Chip } from '@mui/material';
import { Layout } from '@/components/common';
import type { News } from '@/types/database';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function truncate(text: string | null, max = 80): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

interface Props {
  items: News[];
}

export default function NewsListClient({ items }: Props) {
  return (
    <Layout>
      <Box sx={{ background: 'linear-gradient(180deg, #FFF0F3 0%, #FFFBFC 100%)', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography
            component="div"
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: 'primary.main',
              lineHeight: 1,
              mb: 1,
            }}
          >
            NEWS
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
            新着情報
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
            ニュースはまだありません
          </Typography>
        ) : (
          <Box>
            {items.map((item, index) => (
              <Box key={item.id}>
                <Divider sx={{ borderColor: 'rgba(255, 102, 128, 0.2)' }} />
                <Link href={`/news/${item.slug}`} style={{ textDecoration: 'none' }}>
                  <Box
                    sx={{
                      py: 3,
                      display: 'flex',
                      gap: { xs: 1.5, md: 3 },
                      alignItems: 'flex-start',
                      '&:hover': { opacity: 0.8 },
                      cursor: 'pointer',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { xs: 'flex-start', md: 'center' },
                        gap: { xs: 0.5, md: 2 },
                        flexShrink: 0,
                      }}
                    >
                      <Chip
                        label={item.category}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'text.secondary',
                          color: 'text.secondary',
                          borderRadius: 0,
                          fontSize: '0.75rem',
                          height: 24,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: index === 0 ? 'primary.main' : 'text.secondary',
                          fontWeight: index === 0 ? 600 : 400,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(item.published_at)}
                      </Typography>
                    </Box>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color: index === 0 ? 'primary.main' : 'text.primary',
                          mb: 0.5,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.title}
                      </Typography>
                      {item.excerpt && (
                        <Typography variant="body2" color="text.secondary">
                          {truncate(item.excerpt)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Link>
              </Box>
            ))}
            <Divider sx={{ borderColor: 'rgba(255, 102, 128, 0.2)' }} />
          </Box>
        )}
      </Container>
    </Layout>
  );
}
