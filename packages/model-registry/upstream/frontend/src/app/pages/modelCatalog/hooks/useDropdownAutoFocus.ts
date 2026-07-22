import * as React from 'react';

const FOCUSABLE_SELECTOR =
  'input:not(:disabled), button:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]):not(:disabled)';

// PF Dropdown wraps content in a Menu component whose KeyboardHandler listens on
// `window` for keydown events. That handler intercepts arrow keys, Enter, and Space
// from ANY element inside the Menu container — breaking keyboard interaction with
// custom panel content (Selects, Sliders, Buttons). This hook attaches a `document`-
// level listener that stops those events before they reach `window`, while still
// allowing React handlers (attached at the root container) to fire normally.
// It also traps Tab focus inside the panel so the user can only exit via Escape.
const useDropdownAutoFocus = (isOpen: boolean): React.RefObject<HTMLDivElement> => {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && contentRef.current) {
      const rafId = requestAnimationFrame(() => {
        if (contentRef.current) {
          const focusable = contentRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
          focusable?.focus();
        }
      });
      return () => cancelAnimationFrame(rafId);
    }
    return undefined;
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        return;
      }
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (!target) {
        return;
      }

      // Focus trap: cycle Tab within the panel instead of leaving it
      if (e.key === 'Tab' && contentRef.current?.contains(target)) {
        const focusables = Array.from(
          contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }

      // Let PF handle arrow-key navigation inside nested DropdownList items.
      // Enter/Space must still be blocked so the outer Menu handler doesn't
      // double-fire and close the panel; the browser's native click (from
      // Enter on a focused button) handles selection without PF's handler.
      if (target.closest('li') && ARROW_KEYS.includes(e.key)) {
        return;
      }
      if (contentRef.current?.contains(target)) {
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  return contentRef;
};

export default useDropdownAutoFocus;
