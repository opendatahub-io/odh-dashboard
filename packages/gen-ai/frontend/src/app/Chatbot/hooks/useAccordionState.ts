import * as React from 'react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { DEFAULT_EXPANDED_ACCORDION_ITEMS } from '~/app/Chatbot/const';

export interface UseAccordionStateReturn {
  expandedAccordionItems: string[];
  onAccordionToggle: (id: string) => void;
}

const useAccordionState = (): UseAccordionStateReturn => {
  const [expandedAccordionItems, setExpandedAccordionItems] = React.useState<string[]>(
    DEFAULT_EXPANDED_ACCORDION_ITEMS,
  );

  const onAccordionToggle = React.useCallback(
    (id: string) => {
      const isExpanded = expandedAccordionItems.includes(id);
      const action = isExpanded ? 'collapsed' : 'expanded';

      fireMiscTrackingEvent('Playground Settings Section Toggled', {
        section: id,
        action,
      });

      if (isExpanded) {
        setExpandedAccordionItems((currentExpanded) =>
          currentExpanded.filter((itemId) => itemId !== id),
        );
      } else {
        setExpandedAccordionItems((currentExpanded) => [...currentExpanded, id]);
      }
    },
    [expandedAccordionItems],
  );

  return {
    expandedAccordionItems,
    onAccordionToggle,
  };
};

export default useAccordionState;
