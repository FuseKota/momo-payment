'use client';

import { useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { Box, Container, Typography, Divider, Chip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Layout } from '@/components/common';
import type { News } from '@/types/database';
import { formatNewsDate } from '@/lib/utils/format';
import styles from './news.module.css';

const gold = '#fbc02d';
const dividerColor = 'rgba(251, 192, 45, 0.2)';
const chipBorderColor = 'rgba(255,255,255,0.4)';
const chipTextColor = 'rgba(255,255,255,0.55)';

function truncate(text: string | null, max = 80): string {
  if (!text) return '';
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join('') + '…' : text;
}

interface Props {
  items: News[];
}

export default function NewsListClient({ items }: Props) {
  const t = useTranslations('news');

  useEffect(() => {
    const faders = document.querySelectorAll('.fade-in-up');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('appear');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );
    faders.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <Layout>
      <div className={styles.pageContent}>
        {/* Hero */}
        <Box className={styles.hero}>
          <p className={styles.heroTitle}>NEWS</p>
          <p className={styles.heroSubtitle}>{t('heading')}</p>
        </Box>

        {/* List */}
        <Box className={styles.listSection}>
          <Container maxWidth="lg">
            {items.length === 0 ? (
              <Typography sx={{ py: 8, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                {t('noItems')}
              </Typography>
            ) : (
              <Box>
                {items.map((item, index) => (
                  <Box key={item.id} className="fade-in-up" style={{ transitionDelay: `${index * 0.05}s` }}>
                    <Divider sx={{ borderColor: dividerColor }} />
                    <Link href={`/news/${item.slug}`} style={{ textDecoration: 'none' }}>
                      <Box
                        sx={{
                          py: 3,
                          display: 'flex',
                          gap: { xs: 1.5, md: 3 },
                          alignItems: 'flex-start',
                          '&:hover': { opacity: 0.75 },
                          cursor: 'pointer',
                          transition: 'opacity 0.2s',
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
                              borderColor: chipBorderColor,
                              color: chipTextColor,
                              borderRadius: 0,
                              fontSize: '0.75rem',
                              height: 24,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color: index === 0 ? gold : 'rgba(255,255,255,0.45)',
                              fontWeight: index === 0 ? 600 : 400,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatNewsDate(item.published_at)}
                          </Typography>
                        </Box>

                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              color: index === 0 ? gold : 'rgba(255,255,255,0.9)',
                              mb: 0.5,
                              lineHeight: 1.5,
                            }}
                          >
                            {item.title}
                          </Typography>
                          {item.excerpt && (
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)' }}>
                              {truncate(item.excerpt)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Link>
                  </Box>
                ))}
                <Divider sx={{ borderColor: dividerColor }} />
              </Box>
            )}
          </Container>
        </Box>
      </div>
    </Layout>
  );
}
