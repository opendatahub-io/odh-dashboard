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
    const raw = e.clipboardData.getData('text');
    const trimmed = raw.trim();
    if (!onChange || trimmed === raw) {
      // nothing to trim – let the browser paste as-is
      return;
    }
    // Prevent the default paste so the untrimmed text is not inserted.
    e.preventDefault();
    // Insert via execCommand so the browser records the change in its undo stack,
    // preserving Ctrl+Z behavior. The insertion triggers the input's onChange handler
    // which propagates the trimmed value to React state.
    // execCommand is deprecated but has no replacement that preserves the undo stack.
    document.execCommand('insertText', false, trimmed);
  };
