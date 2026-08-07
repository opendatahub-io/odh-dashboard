import { Button } from '@patternfly/react-core';
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
    <Button
      isInline
      variant="link"
      onClick={onToggle}
      data-testid={testId}
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
  );
};

export default ShowAllButton;
