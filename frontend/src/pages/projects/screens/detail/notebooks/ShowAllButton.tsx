import { Badge, Button, Flex, FlexItem } from '@patternfly/react-core';
import React from 'react';

type ShowAllButtonProps = {
  visibleLength: number;
  isExpanded: boolean;
  totalSize: number;
  onToggle: () => void;
  'data-testid'?: string;
};

const ShowAllButton: React.FC<ShowAllButtonProps> = ({
  visibleLength,
  totalSize,
  onToggle,
  isExpanded,
  'data-testid': testId,
}) => {
  if (visibleLength >= totalSize) {
    return null;
  }

  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} data-testid={testId}>
      <FlexItem>
        <Button isInline variant="link" onClick={onToggle}>
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
