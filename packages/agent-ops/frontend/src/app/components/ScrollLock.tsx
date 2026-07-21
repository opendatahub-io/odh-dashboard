import * as React from 'react';
import { getDashboardMainContainer } from '@odh-dashboard/internal/utilities/utils';

let lockCount = 0;
let previousOverflow: string | undefined;

type ScrollLockProps = {
  children: React.ReactNode;
};

/** Locks host main scroll while a full-page agent-ops overlay (e.g. deploy wizard) is mounted. */
const ScrollLock: React.FC<ScrollLockProps> = ({ children }) => {
  React.useLayoutEffect(() => {
    const scrollContainer = getDashboardMainContainer();

    if (lockCount === 0) {
      previousOverflow = scrollContainer.style.overflow;
      scrollContainer.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount <= 0) {
        scrollContainer.style.overflow = previousOverflow ?? '';
        previousOverflow = undefined;
      }
    };
  }, []);

  return children;
};

export default ScrollLock;
