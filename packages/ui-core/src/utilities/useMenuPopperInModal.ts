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

/**
 * Portal menu into the nearest modal dialog (when appendTo is unset) and unlock
 * dialog overflow while open — PatternFly Modal + dropdown a11y pattern.
 */
export const useMenuPopperInModal = <T extends MenuPopperProps>(
  isOpen: boolean,
  anchorRef: React.RefObject<Element | null>,
  userPopperProps?: T,
): MenuPopperWithAppendTo<T> => {
  useModalOverflowUnlock(isOpen, anchorRef);

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
