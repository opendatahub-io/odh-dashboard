import * as React from 'react';

export const MODAL_OVERFLOW_UNLOCK_COUNT_ATTR = 'data-modal-overflow-unlock-count';
export const MODAL_OVERFLOW_ORIGINAL_ATTR = 'data-modal-overflow-original';

/** Resolve popper mount target: portal into the nearest modal dialog for VoiceOver + aria-modal. */
export const resolveSelectPopperAppendTo = (anchor: HTMLElement | null | undefined): HTMLElement =>
  anchor?.closest<HTMLElement>('[role="dialog"]') ?? document.body;

/** Unlock modal overflow while a portaled select menu is open; ref-counts when multiple instances share a dialog. */
export const useModalOverflowUnlock = (
  isOpen: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
): void => {
  React.useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    const dialog = anchorRef.current?.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) {
      return;
    }
    const unlockCount = Number(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR) ?? '0');
    if (unlockCount === 0) {
      dialog.setAttribute(MODAL_OVERFLOW_ORIGINAL_ATTR, dialog.style.overflow);
    }
    dialog.setAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR, String(unlockCount + 1));
    dialog.style.overflow = 'visible';
    return () => {
      const currentCount = Number(dialog.getAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR) ?? '1');
      const nextCount = currentCount - 1;
      if (nextCount <= 0) {
        dialog.style.overflow = dialog.getAttribute(MODAL_OVERFLOW_ORIGINAL_ATTR) ?? '';
        dialog.removeAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR);
        dialog.removeAttribute(MODAL_OVERFLOW_ORIGINAL_ATTR);
      } else {
        dialog.setAttribute(MODAL_OVERFLOW_UNLOCK_COUNT_ATTR, String(nextCount));
      }
    };
    // anchorRef is stable; dialog is resolved from the ref at effect time only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
};
