'use client';

import { Link } from '@/i18n/navigation';
import { Box, Container, Typography, Divider, Chip } from '@mui/material';
import type { News } from '@/types/database';

interface NewsSectionProps {
  items: News[];
  variant?: 'light' | 'dark';
  title?: string;
  showViewAll?: boolean;
}

// SSR (UTC) と CSR (Asia/Tokyo 等) で日付がずれて hydration mismatch を
// 起こすため、表示は Asia/Tokyo 固定で生成する。
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return dateFormatter.format(d).replace(/-/g, '.');
}

function truncate(text: string | null, max = 60): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

const gold = '#fbc02d';

export default function NewsSection({ items, variant = 'light', title, showViewAll }: NewsSectionProps) {
  if (items.length === 0 && title === undefined) return null;

  const isDark = variant === 'dark';
  const dividerColor = isDark ? 'rgba(251, 192, 45, 0.2)' : 'rgba(255, 102, 128, 0.2)';
  const chipBorderColor = isDark ? 'rgba(255,255,255,0.4)' : 'text.secondary';
  const chipTextColor = isDark ? 'rgba(255,255,255,0.6)' : 'text.secondary';
  const dateColorFirst = isDark ? gold : 'primary.main';
  const dateColorRest = isDark ? 'rgba(255,255,255,0.5)' : 'text.secondary';
  const titleColorFirst = isDark ? gold : 'primary.main';
  const titleColorRest = isDark ? 'rgba(255,255,255,0.9)' : 'text.primary';
  const excerptColor = isDark ? 'rgba(255,255,255,0.5)' : 'text.secondary';
  const viewAllColor = isDark ? 'rgba(255,255,255,0.5)' : 'text.secondary';
  const viewAllHover = isDark ? gold : 'primary.main';

  return (
    <Box
      sx={{
        py: isDark ? { xs: 10, md: 15 } : { xs: 6, md: 8 },
        background: isDark ? '#1e1e1e' : '#FFFBFC',
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: isDark ? 8 : 4, textAlign: 'center' }}>
          {isDark ? (
            <Box
              component="span"
              sx={{
                display: 'block',
                fontFamily: "'Noto Serif JP', serif",
                fontSize: { xs: '2.2rem', md: '3rem' },
                fontWeight: 700,
                color: '#ffffff',
                textShadow: 'none',
                position: 'relative',
                pb: '28px',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '60%',
                  height: '3px',
                  background: gold,
                  boxShadow: `0 0 10px ${gold}`,
                },
              }}
            >
              {title ?? '新着情報'}
            </Box>
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {title ?? '新着情報'}
            </Typography>
          )}
        </Box>

        {/* News list */}
        <Box>
          {items.length === 0 && (
            <>
              <Divider sx={{ borderColor: dividerColor }} />
              <Typography
                variant="body2"
                sx={{ py: 4, textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.4)' : 'text.secondary' }}
              >
                現在、情報はありません
              </Typography>
              <Divider sx={{ borderColor: dividerColor }} />
            </>
          )}
          {items.map((item, index) => (
            <Box key={item.id}>
              <Divider sx={{ borderColor: dividerColor }} />
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
                  {/* Category + Date */}
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
                        color: index === 0 ? dateColorFirst : dateColorRest,
                        fontWeight: index === 0 ? 600 : 400,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(item.published_at)}
                    </Typography>
                  </Box>

                  {/* Title + Excerpt */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        color: index === 0 ? titleColorFirst : titleColorRest,
                        mb: 0.5,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.title}
                    </Typography>
                    {item.excerpt && (
                      <Typography variant="body2" sx={{ color: excerptColor }}>
                        {truncate(item.excerpt)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Link>
            </Box>
          ))}
          {items.length > 0 && <Divider sx={{ borderColor: dividerColor }} />}
        </Box>

        {/* View all link */}
        {showViewAll !== false && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Link href="/news" style={{ textDecoration: 'none' }}>
              <Typography
                variant="body2"
                sx={{
                  color: viewAllColor,
                  '&:hover': { color: viewAllHover },
                }}
              >
                一覧をみる
              </Typography>
            </Link>
          </Box>
        )}
      </Container>
    </Box>
  );
}
