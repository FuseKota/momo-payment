'use client';

import { Box, TextField, Button, Alert } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslations, useLocale } from 'next-intl';
import { usePostalCodeLookup, type LookupErrorCode } from '@/hooks/usePostalCodeLookup';

interface AddressResult {
  prefecture: string;
  city: string;
  town?: string;
}

interface PostalCodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  onAddressFound: (result: AddressResult) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export default function PostalCodeField({
  value,
  onChange,
  onAddressFound,
  label,
  placeholder,
  required,
}: PostalCodeFieldProps) {
  const t = useTranslations('postalCodeLookup');
  const locale = useLocale();
  const { lookup, isLoading, error, clearError } = usePostalCodeLookup();

  const defaultPlaceholder = locale === 'zh-tw' ? '100 / 10001' : '123-4567';

  const errorMessages: Record<LookupErrorCode, string> = {
    NOT_FOUND: t('notFound'),
    RATE_LIMITED: t('rateLimited'),
    LOOKUP_FAILED: t('lookupFailed'),
  };

  const handleSearch = async () => {
    if (!value.trim()) return;
    const result = await lookup(value.trim());
    if (result) {
      onAddressFound(result);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          label={label}
          fullWidth
          required={required}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (error) clearError();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
        />
        <Button
          variant="outlined"
          onClick={handleSearch}
          disabled={isLoading || !value.trim()}
          sx={{ minWidth: 'auto', px: 2, height: 56, whiteSpace: 'nowrap' }}
          startIcon={<SearchIcon />}
        >
          {t('search')}
        </Button>
      </Box>
      {error && (
        <Alert severity="warning" sx={{ mt: 1 }} onClose={clearError}>
          {errorMessages[error]}
        </Alert>
      )}
    </Box>
  );
}
