import * as React from 'react';

export const MODAL_OVERFLOW_UNLOCK_COUNT_ATTR = 'data-modal-overflow-unlock-count';

const MODAL_DIALOG_SELECTOR = '[role="dialog"][aria-modal="true"], [role="dialog"]';

const originalOverflowByDialog = new WeakMap<HTMLElement, string>();
const unlockCountByDialog = new WeakMap<HTMLElement, number>();

/** Resolve popper mount target: portal into the nearest modal dialog for VoiceOver + aria-modal. */
export const resolveSelectPopperAppendTo = (
  anchor: HTMLElement | null | undefined,
): HTMLElement => {
  const dialog = anchor?.closest<HTMLElement>(MODAL_DIALOG_SELECTOR);
  if (dialog) {
    return dialog;
  }
  return anchor?.parentElement ?? document.body;
};

/** Unlock modal overflow while a portaled select menu is open; ref-counts when multiple instances share a dialog. */
export const useModalOverflowUnlock = (
  isOpen: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
): void => {
  React.useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    const dialog = anchorRef.current?.closest<HTMLElement>(MODAL_DIALOG_SELECTOR);
    if (!dialog) {
      return;
    }
    const unlockCount = unlockCountByDialog.get(dialog) ?? 0;
    if (unlockCount === 0) {
      originalOverflowByDialog.set(dialog, dialog.style.overflow);
    }
    unlockCountByDialog.set(dialog, unlockCount + 1);
    dialog.setAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR, String(unlockCount + 1));
    // Inline style required: modal overflow:auto clips portaled select menus.
    dialog.style.overflow = 'visible';
    return () => {
      const currentCount = unlockCountByDialog.get(dialog) ?? 1;
      const nextCount = currentCount - 1;
      if (nextCount <= 0) {
        dialog.style.overflow = originalOverflowByDialog.get(dialog) ?? '';
        originalOverflowByDialog.delete(dialog);
        unlockCountByDialog.delete(dialog);
        dialog.removeAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR);
      } else {
        unlockCountByDialog.set(dialog, nextCount);
        dialog.setAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR, String(nextCount));
      }
    };
    // anchorRef is stable; dialog is resolved from the ref at effect time only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
};
