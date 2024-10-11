import { Badge, Button, Flex, FlexItem } from '@patternfly/react-core';
import React from 'react';

type ShowAllButtonProps = {
  visibleLength: number;
  isExpanded: boolean;
  totalSize: number;
  onToggle: () => void;
};

const ShowAllButton: React.FC<ShowAllButtonProps> = ({
  visibleLength,
  totalSize,
  onToggle,
  isExpanded,
}) => {
  if (visibleLength >= totalSize) {
    return null;
  }

  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
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
