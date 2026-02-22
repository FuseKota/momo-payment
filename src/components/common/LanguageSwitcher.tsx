'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { IconButton, Menu, MenuItem, ListItemText } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import type { Locale } from '@/i18n/routing';

const locales: Locale[] = ['ja', 'zh-tw'];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('languageSwitcher');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleSwitch = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="small"
        sx={{
          color: 'text.secondary',
          '&:hover': { color: 'primary.main', backgroundColor: 'rgba(255, 102, 128, 0.08)' },
        }}
      >
        <TranslateIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {locales.map((l) => (
          <MenuItem
            key={l}
            selected={l === locale}
            onClick={() => handleSwitch(l)}
          >
            <ListItemText>{t(l)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
