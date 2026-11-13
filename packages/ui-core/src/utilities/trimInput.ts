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
    const text = e.clipboardData.getData('text');
    const trimmed = text.trim();
    if (!onChange || trimmed === text) {
      return;
    }
    e.preventDefault();
    // Native editing preserves undo history and fires the input's change handler.
    // execCommand has no undo-preserving replacement for inserting trimmed text.
    const { ownerDocument } = e.currentTarget;
    if (
      typeof ownerDocument.execCommand === 'function' &&
      ownerDocument.execCommand('insertText', false, trimmed)
    ) {
      return;
    }
    const { selectionStart, selectionEnd, value: current } = e.currentTarget;
    const resolvedStart = selectionStart ?? 0;
    const start = current.slice(0, resolvedStart);
    const newValue = start + trimmed + current.slice(selectionEnd ?? resolvedStart);
    onChange(newValue);
  };
