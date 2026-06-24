'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Button, Container, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

// [locale] セグメント配下のサーバ/クライアントコンポーネントで例外が throw された際の
// エラー境界。NextIntlClientProvider 内に位置するため i18n が利用でき、3言語で表示できる。
// ここで局所回復することで、アプリ全体を置き換える global-error.tsx への昇格を防ぐ。
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    secureLog('error', 'Locale segment error boundary', safeErrorLog(error));
  }, [error]);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: 'text.primary' }}>
        {t('errors.somethingWrong')}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button variant="contained" size="large" startIcon={<RefreshIcon />} onClick={reset}>
          {t('retry')}
        </Button>
      </Box>
    </Container>
  );
}
