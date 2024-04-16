import * as React from 'react';
import {
  DEFAULT_SPACER_NODE_TYPE,
  GraphElement,
  Edge,
  EdgeTerminalType,
  observer,
  TaskEdge,
} from '@patternfly/react-topology';

interface PipelineTaskEdgeProps {
  element: GraphElement;
}

const PipelineTaskEdge: React.FC<PipelineTaskEdgeProps> = ({ element, ...props }) => {
  const edge = element as Edge;
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
