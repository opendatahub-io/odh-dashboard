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
  (onChange?: (value: string) => void) =>
  (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const trimmed = e.clipboardData.getData('text').trim();
    if (!onChange) {
      return;
    }
    e.preventDefault();
    const { selectionStart, selectionEnd, value: current } = e.currentTarget;
    const resolvedStart = selectionStart ?? 0;
    const start = current.slice(0, resolvedStart);
    const newValue = start + trimmed + current.slice(selectionEnd ?? resolvedStart);
    onChange(newValue);
  };
