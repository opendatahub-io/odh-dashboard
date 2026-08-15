import * as React from 'react';
import {
  t_global_color_brand_default as colorBrand,
  t_global_color_status_danger_default as colorStatusDanger,
  t_global_border_color_default as borderColorDefault,
} from '@patternfly/react-tokens';
import { Edge, GraphElement, observer, isEdge, Node } from '@patternfly/react-topology';
import { isBranchCorridorNodeId } from './stageMapStepMetadata';
import { buildTreeEdgePath } from './treeEdgePath';
import { isTreeNodeData } from './treeStepState';

type TreeEdgeProps = {
  element: GraphElement;
};

const COLORS = {
  completed: borderColorDefault.var,
  active: colorBrand.var,
  failed: colorStatusDanger.var,
  default: borderColorDefault.var,
};

const getEdgeColor = (sourceNode: Node, targetNode: Node): string => {
  const sourceData = sourceNode.getData();
  const targetData = targetNode.getData();
  const sourceState = isTreeNodeData(sourceData) ? sourceData.stepState : 'pending';
  const targetState = isTreeNodeData(targetData) ? targetData.stepState : 'pending';

  if (sourceState === 'completed' && targetState === 'completed') {
    return COLORS.completed;
  }

  if (sourceState === 'failed' && targetState === 'failed') {
    return COLORS.failed;
  }

  if (sourceState === 'active' && targetState === 'active') {
    return COLORS.active;
  }

  return COLORS.default;
};

const getEdgeStrokeWidth = (sourceNode: Node, targetNode: Node): number => {
  const sourceData = sourceNode.getData();
  const targetData = targetNode.getData();
  const sourceState = isTreeNodeData(sourceData) ? sourceData.stepState : 'pending';
  const targetState = isTreeNodeData(targetData) ? targetData.stepState : 'pending';

  if (sourceState === 'active' && targetState === 'active') {
    const sourceId = sourceNode.getId();
    const targetId = targetNode.getId();
    if (isBranchCorridorNodeId(sourceId) || isBranchCorridorNodeId(targetId)) {
      return 2.5;
    }
  }

  return 1.5;
};

const TreeEdgeInner: React.FC<{ edge: Edge }> = observer(({ edge }) => {
  const sourceNode = edge.getSource();
  const targetNode = edge.getTarget();

  return (
    <path
      d={buildTreeEdgePath(sourceNode.getBounds(), targetNode.getBounds())}
      fill="none"
      stroke={getEdgeColor(sourceNode, targetNode)}
      strokeWidth={getEdgeStrokeWidth(sourceNode, targetNode)}
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
