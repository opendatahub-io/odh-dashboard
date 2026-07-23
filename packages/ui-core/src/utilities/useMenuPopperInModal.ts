import * as React from 'react';
import { resolveSelectPopperAppendTo, useModalOverflowUnlock } from './useModalOverflowUnlock';

/** PatternFly Select/Dropdown/MenuContainer popper append target. */
export type MenuPopperAppendTo = HTMLElement | (() => HTMLElement) | 'inline';

export type MenuPopperProps = {
  appendTo?: MenuPopperAppendTo;
};

type MenuPopperWithAppendTo<T extends MenuPopperProps> = Omit<T, 'appendTo'> & {
  appendTo: MenuPopperAppendTo;
};

export type UseMenuPopperInModalOptions = {
  /**
   * Close the open menu when Escape is pressed.
   * Escape is handled in the capture phase so PatternFly Modal's body listener
   * does not dismiss the dialog (including when focus is in a portaled menu).
   */
  onEscapeClose?: () => void;
};

/**
 * Portal menu into the nearest modal dialog (when appendTo is unset) and unlock
 * dialog overflow while open — PatternFly Modal + dropdown a11y pattern.
 */
export const useMenuPopperInModal = <T extends MenuPopperProps>(
  isOpen: boolean,
  anchorRef: React.RefObject<Element | null>,
  userPopperProps?: T,
  options?: UseMenuPopperInModalOptions,
): MenuPopperWithAppendTo<T> => {
  useModalOverflowUnlock(isOpen, anchorRef);

  const onEscapeCloseRef = React.useRef(options?.onEscapeClose);
  const shouldInterceptEscape = options?.onEscapeClose !== undefined;

  React.useLayoutEffect(() => {
    onEscapeCloseRef.current = options?.onEscapeClose;
  });

  React.useEffect(() => {
    if (!isOpen || !shouldInterceptEscape) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      const close = onEscapeCloseRef.current;
      if (!close) {
        return;
      }
      // Capture on document: runs before Modal's bubble listener on body.
      // Covers toggle focus and focus moved into a portaled menu.
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, shouldInterceptEscape]);

  return React.useMemo((): MenuPopperWithAppendTo<T> => {
    const appendTo: MenuPopperAppendTo =
      userPopperProps?.appendTo !== undefined
        ? userPopperProps.appendTo
        : () => resolveSelectPopperAppendTo(anchorRef.current);

    // Generic spread cannot prove Omit<T> without a cast (TS limitation).
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return { ...userPopperProps, appendTo } as MenuPopperWithAppendTo<T>;
    // anchorRef is stable; resolve at appendTo call time from .current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPopperProps]);
};
