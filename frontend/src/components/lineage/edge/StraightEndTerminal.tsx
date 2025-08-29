import React from 'react';
import { Edge, EdgeTerminalType, NodeStatus, observer } from '@patternfly/react-topology';

interface StraightEndTerminalProps {
  className?: string;
  isTarget?: boolean;
  edge: Edge;
  size?: number;
  terminalType?: EdgeTerminalType;
  status?: NodeStatus;
}

/**
 * Custom terminal component that always points straight horizontally into the target node
 */
const StraightEndTerminal: React.FunctionComponent<StraightEndTerminalProps> = observer(
  ({ className, isTarget = true, edge, size = 6, terminalType }) => {
    if (terminalType === EdgeTerminalType.none) {
      return null;
    }

    const startPoint = edge.getStartPoint();
    const endPoint = edge.getEndPoint();

    // For the end terminal, calculate position based on straight horizontal approach
    let x: number, y: number, angle: number;

    if (isTarget) {
      x = endPoint.x;
      y = endPoint.y;

      const isComingFromLeft = startPoint.x < endPoint.x;
      angle = isComingFromLeft ? 0 : 180;
    } else {
      x = startPoint.x;
      y = startPoint.y;

      const isGoingRight = endPoint.x > startPoint.x;
      angle = isGoingRight ? 0 : 180;
    }

    // Calculate the points for the arrow triangle
    const halfSize = size / 2;
    const arrowLength = size * 0.8;

    let tipX: number, baseX: number;

    if (isTarget) {
      if (angle === 0) {
        baseX = x - arrowLength;
        tipX = x;
      } else {
        baseX = x + arrowLength;
        tipX = x;
      }
    } else if (angle === 0) {
      tipX = x + arrowLength;
      baseX = x;
    } else {
      tipX = x - arrowLength;
      baseX = x;
    }

    const tipY = y;
    const baseY1 = y - halfSize;
    const baseY2 = y + halfSize;

    const arrowPath = `M ${tipX} ${tipY} L ${baseX} ${baseY1} L ${baseX} ${baseY2} Z`;

    const terminalColor = 'var(--pf-global--Color--100)';

    return (
      <g className={className}>
        <path
          d={arrowPath}
          fill={terminalColor}
          stroke={terminalColor}
          strokeWidth="1"
          style={{
            transition: 'fill 0.2s ease, stroke 0.2s ease',
          }}
        />
      </g>
    );
  },
);

export default StraightEndTerminal;
