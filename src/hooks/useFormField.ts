import { useState, useCallback, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';

export function useFormField<T extends Record<string, string>>(initialValues: T) {
  const [form, setForm] = useState<T>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof T, string>>>({});

  const handleChange = useCallback(
    (field: keyof T) =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        setFieldErrors((prev) => {
          if (prev[field]) {
            return { ...prev, [field]: undefined };
          }
          return prev;
        });
      },
    []
  );

  const setFieldValue = useCallback((field: keyof T, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setValues = useCallback((values: Partial<T>) => {
    setForm((prev) => ({ ...prev, ...values }));
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  return {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    handleChange,
    setFieldValue,
    setValues,
    clearFieldError,
  };
}
