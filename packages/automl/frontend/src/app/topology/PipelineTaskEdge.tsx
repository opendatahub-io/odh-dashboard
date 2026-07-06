import * as React from 'react';
import {
  GraphElement,
  observer,
  TaskEdge,
  WithSelectionProps,
  isEdge,
} from '@patternfly/react-topology';

interface PipelineTaskEdgeProps extends WithSelectionProps {
  element: GraphElement;
}

const PipelineTaskEdge: React.FC<PipelineTaskEdgeProps> = ({ element, ...props }) => {
  if (!isEdge(element)) {
    throw new Error('Element is not Edge');
  }
  const edge = element;
  return <TaskEdge element={edge} {...props} />;
};

export default observer(PipelineTaskEdge);
