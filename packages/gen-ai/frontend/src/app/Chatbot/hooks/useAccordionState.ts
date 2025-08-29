import * as React from 'react';
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
      if (expandedAccordionItems.includes(id)) {
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
