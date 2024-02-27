import React from 'react';
import {
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  List,
  ListItemProps,
} from '@patternfly/react-core';

interface BulkActionExpandableSectionProps {
  title: string;
  children: React.ReactElement<ListItemProps>[];
}

export const BulkActionExpandableSection: React.FC<BulkActionExpandableSectionProps> = ({
  title,
  children,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <ExpandableSection
      isExpanded={isExpanded}
      onToggle={(_e, expanded) => setIsExpanded(expanded)}
      toggleContent={
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{title}</FlexItem>

          <Label color="blue" isCompact>
            {children.length}
          </Label>
        </Flex>
      }
      isIndented
    >
      <List>{children}</List>
    </ExpandableSection>
  );
};
