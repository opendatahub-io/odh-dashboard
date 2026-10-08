import * as React from 'react';
import {
  t_global_color_status_danger_default as colorStatusDanger,
  t_global_border_color_default as borderColorDefault,
} from '@patternfly/react-tokens';
import { Edge, GraphElement, observer, isEdge, Node } from '@patternfly/react-topology';
import { buildTreeEdgePath, fanOutLabelClearX } from '@odh-dashboard/autox-core/ui/utils';
import { isTreeNodeData } from './treeStepState';

type TreeEdgeProps = {
  element: GraphElement;
};

const COLORS = {
  failed: colorStatusDanger.var,
  default: borderColorDefault.var,
};

const getEdgeColor = (sourceNode: Node, targetNode: Node): string => {
  const sourceData = sourceNode.getData();
  const targetData = targetNode.getData();
  const sourceState = isTreeNodeData(sourceData) ? sourceData.stepState : 'pending';
  const targetState = isTreeNodeData(targetData) ? targetData.stepState : 'pending';

  if (sourceState === 'failed' && targetState === 'failed') {
    return COLORS.failed;
  }

  // Keep active and completed connectors neutral; status color belongs to the nodes.
  return COLORS.default;
};

type TreeEdgeData = {
  clearLabelLane?: boolean;
};

const isTreeEdgeData = (data: unknown): data is TreeEdgeData =>
  typeof data === 'object' && data !== null;

const TreeEdgeInner: React.FC<{ edge: Edge }> = observer(({ edge }) => {
  const sourceNode = edge.getSource();
  const targetNode = edge.getTarget();
  const targetBounds = targetNode.getBounds();
  const edgeData = edge.getData();
  const clearX =
    isTreeEdgeData(edgeData) && edgeData.clearLabelLane
      ? fanOutLabelClearX(targetBounds.x)
      : undefined;

  return (
    <path
      d={buildTreeEdgePath(sourceNode.getBounds(), targetBounds, { clearX })}
      fill="none"
      stroke={getEdgeColor(sourceNode, targetNode)}
      strokeWidth={1.5}
      strokeLinecap="round"
      data-testid={`tree-edge-${edge.getId()}`}
    />
  );
});
TreeEdgeInner.displayName = 'TreeEdgeInner';

const TreeEdge: React.FC<TreeEdgeProps> = ({ element }) => {
  if (!isEdge(element)) {
    return null;
  }

  return <TreeEdgeInner edge={element} />;
};

export default TreeEdge;
