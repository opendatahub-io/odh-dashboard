import { Badge, Button, Flex, FlexItem } from '@patternfly/react-core';
import React from 'react';

type ShowAllButtonProps = {
  visibleLength: number;
  isExpanded: boolean;
  totalSize: number;
  onToggle: () => void;
  toggleAriaLabel?: {
    expanded: string;
    collapsed: string;
  };
  'data-testid'?: string;
};

const ShowAllButton: React.FC<ShowAllButtonProps> = ({
  visibleLength,
  totalSize,
  onToggle,
  isExpanded,
  toggleAriaLabel,
  'data-testid': testId,
}) => {
  if (visibleLength >= totalSize) {
    return null;
  }

  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} data-testid={testId}>
      <FlexItem>
        <Button
          isInline
          variant="link"
          onClick={onToggle}
          aria-label={
            toggleAriaLabel
              ? isExpanded
                ? toggleAriaLabel.expanded
                : toggleAriaLabel.collapsed
              : undefined
          }
        >
          {isExpanded ? 'Show less' : 'Show all'}
        </Button>
      </FlexItem>
      <FlexItem>
        {!isExpanded && <Badge isRead>{`${totalSize - visibleLength} more`}</Badge>}
      </FlexItem>
    </Flex>
  );
};

export default ShowAllButton;
