import * as React from 'react';
import { Edge, GraphElement, observer, isEdge } from '@patternfly/react-topology';

type TreeEdgeProps = {
  element: GraphElement;
};

// Offset to align edges with node centers (PF topology anchors at bounding box edge)
const Y_OFFSET = -8;

const buildPath = (edge: Edge): string => {
  const startPoint = edge.getStartPoint();
  const endPoint = edge.getEndPoint();

  // Apply offset to align with node centers
  const startY = startPoint.y + Y_OFFSET;
  const endY = endPoint.y + Y_OFFSET;

  // Check if this is a horizontal line (same Y) or needs a curve
  const isHorizontal = Math.abs(startY - endY) < 5;

  if (isHorizontal) {
    // Straight line for horizontal connections
    return `M ${startPoint.x} ${startY} L ${endPoint.x} ${endY}`;
  }

  // Curved line for fan-out/fan-in (different Y positions)
  const midX = (startPoint.x + endPoint.x) / 2;
  return `M ${startPoint.x} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endPoint.x} ${endY}`;
};

const TreeEdge: React.FC<TreeEdgeProps> = ({ element }) => {
  if (!isEdge(element)) {
    return null;
  }

  return (
    <g data-testid={`tree-edge-${element.getId()}`}>
      <path
        d={buildPath(element)}
        fill="none"
        stroke="#8A8D90"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </g>
  );
};

export default observer(TreeEdge);
