import * as React from 'react';
import { Edge, GraphElement, observer, isEdge, Node } from '@patternfly/react-topology';
import type { TreeNodeData } from './TreeNode';

type TreeEdgeProps = {
  element: GraphElement;
};

const NODE_RADIUS = 9;
const Y_OFFSET = -4;

const COLORS = {
  completed: '#6A6E73',
  active: '#6A6E73',
  failed: '#C9190B',
  pending: '#D2D2D2',
  unreached: '#C9190B',
};

const isTreeNodeData = (data: unknown): data is TreeNodeData => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  return 'stepState' in data && typeof data.stepState === 'string';
};

type EdgeStyle = {
  stroke: string;
  dashed: boolean;
};

const getEdgeStyle = (sourceNode: Node, targetNode: Node): EdgeStyle => {
  const sourceData = sourceNode.getData();
  const targetData = targetNode.getData();
  const sourceState = isTreeNodeData(sourceData) ? sourceData.stepState : 'pending';
  const targetState = isTreeNodeData(targetData) ? targetData.stepState : 'pending';

  if (sourceState === 'failed' && targetState === 'pending') {
    return { stroke: COLORS.pending, dashed: true };
  }

  if (sourceState === 'failed' || targetState === 'failed') {
    return { stroke: COLORS.failed, dashed: true };
  }

  if (sourceState === 'unreached' || targetState === 'unreached') {
    return { stroke: COLORS.completed, dashed: false };
  }

  if (sourceState === 'completed' && targetState === 'pending') {
    return { stroke: COLORS.pending, dashed: true };
  }

  if (sourceState === 'completed' && targetState === 'completed') {
    return { stroke: COLORS.completed, dashed: false };
  }

  if (sourceState === 'completed' && targetState === 'active') {
    return { stroke: COLORS.active, dashed: false };
  }

  if (sourceState === 'active' || targetState === 'active') {
    return { stroke: COLORS.active, dashed: false };
  }

  return { stroke: COLORS.pending, dashed: targetState === 'pending' };
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

  const nx = dx / length;
  const ny = dy / length;

  const adjustedStartX = startPoint.x + nx * NODE_RADIUS;
  const adjustedStartY = startY + ny * NODE_RADIUS;
  const adjustedEndX = endPoint.x - nx * NODE_RADIUS;
  const adjustedEndY = endY - ny * NODE_RADIUS;

  const isHorizontal = Math.abs(startY - endY) < 5;

  if (isHorizontal) {
    return `M ${adjustedStartX} ${adjustedStartY} L ${adjustedEndX} ${adjustedEndY}`;
  }

  const midX = (adjustedStartX + adjustedEndX) / 2;
  return `M ${adjustedStartX} ${adjustedStartY} C ${midX} ${adjustedStartY}, ${midX} ${adjustedEndY}, ${adjustedEndX} ${adjustedEndY}`;
};

const TreeEdgeInner: React.FC<{ edge: Edge }> = ({ edge }) => {
  const sourceNode = edge.getSource();
  const targetNode = edge.getTarget();
  const { stroke, dashed } = getEdgeStyle(sourceNode, targetNode);

  return (
    <path
      d={buildPath(edge)}
      fill="none"
      stroke={stroke}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeDasharray={dashed ? '5 4' : undefined}
      data-testid={`tree-edge-${edge.getId()}`}
    />
  );
};

const TreeEdge: React.FC<TreeEdgeProps> = ({ element }) => {
  if (!isEdge(element)) {
    return null;
  }

  return <TreeEdgeInner edge={element} />;
};

export default observer(TreeEdge);
