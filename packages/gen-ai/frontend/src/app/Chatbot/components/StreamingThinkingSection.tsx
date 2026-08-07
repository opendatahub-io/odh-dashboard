import * as React from 'react';
import { ExpandableSection } from '@patternfly/react-core';

export const StreamingThinkingSection: React.FC<{
  reasoningText: string;
  isComplete: boolean;
}> = ({ reasoningText, isComplete }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  React.useEffect(() => {
    if (isComplete) {
      setIsExpanded(false);
    }
  }, [isComplete]);

  return React.createElement(
    ExpandableSection,
    {
      toggleContent: 'Show thinking',
      isExpanded,
      onToggle: (_e: React.MouseEvent, expanded: boolean) => setIsExpanded(expanded),
    },
    React.createElement(
      'div',
      { style: { fontSize: 'var(--pf-t--global--font--size--sm)', whiteSpace: 'pre-wrap' } },
      reasoningText,
    ),
  );
};
