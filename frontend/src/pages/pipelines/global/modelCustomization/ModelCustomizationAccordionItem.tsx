import * as React from 'react';
import { AccordionContent, AccordionItem, AccordionToggle } from '@patternfly/react-core';

interface ModelCustomizationItemProps {
  id: string;
  title: string;
  itemsExpanded: string[];
  handleToggle: (id: string) => void;
}

export const ModelCustomizationAccordionItem: React.FC<
  React.PropsWithChildren<ModelCustomizationItemProps>
> = ({ id, title, children, itemsExpanded, handleToggle }) => (
  <AccordionItem data-testid={`accordion-item ${id}`} isExpanded={itemsExpanded.includes(id)}>
    <AccordionToggle id={id} onClick={() => handleToggle(id)}>
      {title}
    </AccordionToggle>
    <AccordionContent>{children}</AccordionContent>
  </AccordionItem>
);
