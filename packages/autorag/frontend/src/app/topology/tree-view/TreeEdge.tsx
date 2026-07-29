import * as React from 'react';
import {
  t_global_color_brand_default as colorBrand,
  t_global_color_status_danger_default as colorStatusDanger,
  t_global_border_color_default as borderColorDefault,
} from '@patternfly/react-tokens';
import { Edge, GraphElement, observer, isEdge, Node } from '@patternfly/react-topology';
import { isTreeNodeData } from './treeStepState';

type TreeEdgeProps = {
  element: GraphElement;
};

const X_OFFSET = 10;
const Y_OFFSET = -4;

const COLORS = {
  active: colorBrand.var,
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

  if (sourceState === 'active' && targetState === 'active') {
    return COLORS.active;
  }

  return COLORS.default;
};

const buildPath = (edge: Edge): string => {
  const startPoint = edge.getStartPoint();
  const endPoint = edge.getEndPoint();

  const startY = startPoint.y + Y_OFFSET;
  const endY = endPoint.y + Y_OFFSET;

  const dx = endPoint.x - startPoint.x;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return '';
  }

  const startX = startPoint.x + X_OFFSET;
  const endX = endPoint.x - X_OFFSET;

  const isHorizontal = Math.abs(startY - endY) < 5;

  if (isHorizontal) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const midX = (startX + endX) / 2;
  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
};

const TreeEdgeInner: React.FC<{ edge: Edge }> = observer(({ edge }) => {
  const sourceNode = edge.getSource();
  const targetNode = edge.getTarget();

  return (
    <path
      d={buildPath(edge)}
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
