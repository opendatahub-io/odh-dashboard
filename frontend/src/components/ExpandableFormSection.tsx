import * as React from 'react';
import { ExpandableSection, ExpandableSectionProps, FormSection } from '@patternfly/react-core';

type ExpandableFormSectionProps = Omit<ExpandableSectionProps, 'ref'> & {
  initExpanded?: boolean;
};

const ExpandableFormSection: React.FC<ExpandableFormSectionProps> = ({
  children,
  initExpanded = false,
  isIndented = true,
  ...props
}) => {
  const [expanded, setExpanded] = React.useState<boolean>(initExpanded);

  return (
    <ExpandableSection
      isIndented={isIndented}
      isExpanded={expanded}
      onToggle={(_ev, isExpanded) => setExpanded(isExpanded)}
      {...props}
    >
      <FormSection>{children}</FormSection>
    </ExpandableSection>
  );
};

export default ExpandableFormSection;
