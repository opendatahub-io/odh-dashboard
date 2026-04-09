import * as React from 'react';
import { Dashboard, DashboardStickyToolbar } from '@perses-dev/dashboards';

const POPPER_SELECTOR = '.MuiAutocomplete-popper';
const DROPDOWN_MIN_WIDTH = 500;

/**
 * MUI Autocomplete sets an inline `width` on the Popper that matches the
 * input field, which truncates long options when the input is narrow.
 * Perses caps variable inputs at 500 px (MAX_VARIABLE_WIDTH) so we apply the
 * same value as a min-width on the Popper to guarantee all option text is
 * visible regardless of the current input width.
 */
const useAutoSizePoppers = (ref: React.RefObject<HTMLElement | null>): void => {
  React.useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }

    const resizePopper = (el: HTMLElement): void => {
      const { style } = el;
      style.minWidth = `${DROPDOWN_MIN_WIDTH}px`;
    };

    const observer = new MutationObserver(() => {
      container.querySelectorAll<HTMLElement>(POPPER_SELECTOR).forEach(resizePopper);
    });

    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [ref]);
};

const PersesBoard: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useAutoSizePoppers(containerRef);

  return (
    <div ref={containerRef}>
      <DashboardStickyToolbar initialVariableIsSticky={false} />
      <Dashboard
        emptyDashboardProps={{
          title: 'Empty Dashboard',
          description: 'To get started add something to your dashboard',
        }}
      />
    </div>
  );
};

export default PersesBoard;
