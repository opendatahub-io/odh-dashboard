import * as React from 'react';

export const trimInputOnBlur =
  (value: string | undefined, onChange?: (value: string) => void) =>
  (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const trimmed = e.currentTarget.value.trim();
    if (trimmed !== value && onChange) {
      onChange(trimmed);
    }
  };

export const trimInputOnPaste =
  (value: string | undefined, onChange?: (value: string) => void) =>
  (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const trimmed = e.clipboardData.getData('text').trim();
    if (!onChange) {
      return;
    }
    e.preventDefault();
    const { selectionStart, selectionEnd } = e.currentTarget;
    const current = value ?? '';
    const start = current.slice(0, selectionStart ?? 0);
    const newValue = start + trimmed + current.slice(selectionEnd ?? 0);
    onChange(newValue);
  };
