import React from 'react';
import { Node, observer, WithSelectionProps } from '@patternfly/react-topology';
import { isHiddenByCollapsedAncestor, panFocusedControlIntoView } from './a11yUtils';

type PipelineNodeButtonProps = {
  element: Node;
  ariaLabel: string;
  onSelect: WithSelectionProps['onSelect'];
  onFocusChange?: (focused: boolean) => void;
};

// Chrome does not synthesize button clicks from keyboard input inside an SVG foreignObject.
export const activateNodeButtonOnKeyDown = (
  event: React.KeyboardEvent<HTMLButtonElement>,
): void => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (!event.repeat) {
      event.currentTarget.click();
    }
  }
};

/** A native keyboard target over a selectable SVG node; pointer clicks stay on the SVG. */
// TODO: Reassess custom node and group tab stops when
// https://github.com/patternfly/react-topology/pull/322 reaches our installed version.
const PipelineNodeButton: React.FC<PipelineNodeButtonProps> = observer(
  ({ element, ariaLabel, onSelect, onFocusChange }) => {
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
          className="odh-pipeline-node-button pf-v6-u-display-block pf-v6-u-w-100 pf-v6-u-h-100"
          aria-label={ariaLabel}
          onFocus={(event) => {
            panFocusedControlIntoView(element, event.currentTarget);
            onFocusChange?.(true);
          }}
          onBlur={() => onFocusChange?.(false)}
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
