import * as React from 'react';
import { Edge, GraphElement, observer, isEdge, Node } from '@patternfly/react-topology';
import type { TreeNodeData } from './TreeNode';

type TreeEdgeProps = {
  element: GraphElement;
};

// Node radius values (must match TreeNode.tsx)
const STANDARD_RADIUS = 16;
const MODEL_NAME_RADIUS = 20;
const FINAL_SELECT_RADIUS = 32;

// Offset to align edges with node centers (PF topology anchors at bounding box edge)
const Y_OFFSET = -8;

// Arrow marker ID
const ARROW_MARKER_ID = 'tree-edge-arrow';

const isTreeNodeData = (data: unknown): data is TreeNodeData => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  return 'nodeType' in data && typeof data.nodeType === 'string';
};

const getNodeRadius = (node: Node): number => {
  const data = node.getData();
  const nodeType = isTreeNodeData(data) ? data.nodeType : 'standard';

  switch (nodeType) {
    case 'final-select':
      return FINAL_SELECT_RADIUS;
    case 'model-name':
      return MODEL_NAME_RADIUS;
    default:
      return STANDARD_RADIUS;
  }
};

const buildPath = (edge: Edge): string => {
  const sourceNode = edge.getSource();
  const targetNode = edge.getTarget();

  const startPoint = edge.getStartPoint();
  const endPoint = edge.getEndPoint();

  // Apply offset to align with node centers
  const startY = startPoint.y + Y_OFFSET;
  const endY = endPoint.y + Y_OFFSET;

  // Get radii for both nodes
  const sourceRadius = getNodeRadius(sourceNode);
  const targetRadius = getNodeRadius(targetNode);

  // Calculate the direction vector
  const dx = endPoint.x - startPoint.x;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return '';
  }

  // Normalize direction
  const nx = dx / length;
  const ny = dy / length;

  // Start point - offset by half radius to reach the outer circle edge
  const adjustedStartX = startPoint.x + nx * (sourceRadius * 0.5);
  const adjustedStartY = startY + ny * (sourceRadius * 0.5);
  // Offset path end by arrow marker width (8px) so the tip touches the circle edge
  const arrowMarkerWidth = 8;
  const adjustedEndX = endPoint.x - nx * (targetRadius + arrowMarkerWidth);
  const adjustedEndY = endY - ny * (targetRadius + arrowMarkerWidth);

  // Check if this is a horizontal line (same Y) or needs a curve
  const isHorizontal = Math.abs(startY - endY) < 5;

  if (isHorizontal) {
    // Straight line for horizontal connections
    return `M ${adjustedStartX} ${adjustedStartY} L ${adjustedEndX} ${adjustedEndY}`;
  }

  // Curved line for fan-out/fan-in (different Y positions)
  const midX = (adjustedStartX + adjustedEndX) / 2;
  return `M ${adjustedStartX} ${adjustedStartY} C ${midX} ${adjustedStartY}, ${midX} ${adjustedEndY}, ${adjustedEndX} ${adjustedEndY}`;
};

const TreeEdgeInner: React.FC<{ edge: Edge }> = ({ edge }) => (
  <g data-testid={`tree-edge-${edge.getId()}`}>
    {/* Arrow marker definition */}
    <defs>
      <marker
        id={ARROW_MARKER_ID}
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#8A8D90" />
      </marker>
    </defs>
    <path
      d={buildPath(edge)}
      fill="none"
      stroke="#8A8D90"
      strokeWidth={1.5}
      strokeLinecap="round"
      markerEnd={`url(#${ARROW_MARKER_ID})`}
    />
  </g>
);

const TreeEdge: React.FC<TreeEdgeProps> = ({ element }) => {
  if (!isEdge(element)) {
    return null;
  }

  return <TreeEdgeInner edge={element} />;
};

export default observer(TreeEdge);
