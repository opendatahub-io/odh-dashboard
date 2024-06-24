import * as React from 'react';
import {
  DEFAULT_SPACER_NODE_TYPE,
  GraphElement,
  EdgeTerminalType,
  observer,
  TaskEdge,
  isEdge,
} from '@patternfly/react-topology';

interface PipelineTaskEdgeProps {
  element: GraphElement;
}

const PipelineTaskEdge: React.FC<PipelineTaskEdgeProps> = ({ element, ...props }) => {
  if (!isEdge(element)) {
    throw new Error('Element is not Edge');
  }
  const edge = element;
  return (
    <TaskEdge
      element={edge}
      endTerminalType={
        edge.getTarget().getType() !== DEFAULT_SPACER_NODE_TYPE
          ? EdgeTerminalType.directional
          : undefined
      }
      {...props}
    />
  );
};

export default observer(PipelineTaskEdge);
