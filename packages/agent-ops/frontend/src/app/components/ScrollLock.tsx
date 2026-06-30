import * as React from 'react';
import { getDashboardMainContainer } from '@odh-dashboard/internal/utilities/utils';
import './ScrollLock.scss';

const SCROLL_LOCK_CLASS = 'agent-ops-scroll-lock';

type ScrollLockProps = {
  children: React.ReactNode;
};

/** Locks host main scroll while a full-page agent-ops overlay (e.g. deploy wizard) is mounted. */
const ScrollLock: React.FC<ScrollLockProps> = ({ children }) => {
  React.useLayoutEffect(() => {
    const scrollContainer = getDashboardMainContainer();
    scrollContainer.classList.add(SCROLL_LOCK_CLASS);
    return () => {
      scrollContainer.classList.remove(SCROLL_LOCK_CLASS);
    };
  }, []);

  return children;
};

export default ScrollLock;
