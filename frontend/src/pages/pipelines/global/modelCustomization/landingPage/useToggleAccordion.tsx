import * as React from 'react';

export const useToggleAccordion = (): {
  accordionItemsExpanded: string[];
  handleToggleAccordion: (itemId: string) => void;
} => {
  const [accordionItemsExpanded, setAccordionItemsExpanded] = React.useState<string[]>([]);

  const handleToggleAccordion = (itemId: string) => {
    setAccordionItemsExpanded((previousState) =>
      previousState.includes(itemId)
        ? previousState.filter((id) => id !== itemId)
        : [...previousState, itemId],
    );
  };

  return { accordionItemsExpanded, handleToggleAccordion };
};
