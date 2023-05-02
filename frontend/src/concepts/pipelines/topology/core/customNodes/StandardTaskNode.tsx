import * as React from 'react';
import {
  TaskNode,
  DEFAULT_WHEN_OFFSET,
  Node,
  WhenDecorator,
  NodeModel,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { StandardTaskNodeData } from '~/concepts/pipelines/topology/core/types';

type DemoTaskNodeProps = WithSelectionProps & {
  element: Node<NodeModel, StandardTaskNodeData>;
};

const StandardTaskNode: React.FC<DemoTaskNodeProps> = ({ element, onSelect, selected }) => {
  const data = element.getData();

  const whenDecorator = data?.whenStatus ? (
    <WhenDecorator element={element} status={data.whenStatus} leftOffset={DEFAULT_WHEN_OFFSET} />
  ) : null;

  return (
    <TaskNode onSelect={onSelect} selected={selected} element={element} status={data?.status}>
      {whenDecorator}
    </TaskNode>
  );
};

export default StandardTaskNode;
