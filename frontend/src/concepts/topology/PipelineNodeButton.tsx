import React from 'react';
import { Node, observer, WithSelectionProps } from '@patternfly/react-topology';
import { isHiddenByCollapsedAncestor } from './a11yUtils';

type PipelineNodeButtonProps = {
  element: Node;
  ariaLabel: string;
  onSelect: WithSelectionProps['onSelect'];
};

// Chrome does not synthesize button clicks from keyboard input inside an SVG foreignObject.
export const activateNodeButtonOnKeyDown = (
  event: React.KeyboardEvent<HTMLButtonElement>,
): void => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.currentTarget.click();
  }
};

/** A native keyboard target over a selectable SVG node; pointer clicks stay on the SVG. */
const PipelineNodeButton: React.FC<PipelineNodeButtonProps> = observer(
  ({ element, ariaLabel, onSelect }) => {
    const bounds = element.getBounds();

    if (isHiddenByCollapsedAncestor(element)) {
      return null;
    }

    return (
      <foreignObject
        className="odh-pipeline-node-overlay"
        x={0}
        y={0}
        width={bounds.width}
        height={bounds.height}
        overflow="visible"
      >
        <button
          type="button"
          className="odh-pipeline-node-button"
          aria-label={ariaLabel}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(event);
          }}
          onKeyDown={activateNodeButtonOnKeyDown}
          data-pipeline-node-id={element.getId()}
          data-testid={`pipeline-node-button-${element.getLabel()}`}
        />
      </foreignObject>
    );
  },
);

export default PipelineNodeButton;
