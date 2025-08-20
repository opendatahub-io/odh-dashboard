import React from 'react';
import {
  Edge,
  EdgeStyle,
  EdgeTerminalType,
  GraphElement,
  isEdge,
  isNode,
  NodeStatus,
  observer,
} from '@patternfly/react-topology';
import { OnSelect } from '@patternfly/react-topology/dist/esm/behavior';
import { getClosestVisibleParent } from '@patternfly/react-topology/dist/esm/utils';
import { Layer } from '@patternfly/react-topology/dist/esm/components/layers';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-topology/dist/esm/css/topology-components';
import {
  getEdgeAnimationDuration,
  getEdgeStyleClassModifier,
  StatusModifier,
} from '@patternfly/react-topology/dist/esm/utils/style-utils';
import DefaultConnectorTerminal from '@patternfly/react-topology/dist/esm/components/edges/terminals/DefaultConnectorTerminal';
import { Point } from '@patternfly/react-topology/dist/esm/geom';
import { getConnectorStartPoint } from '@patternfly/react-topology/dist/esm/components/edges/terminals/terminalUtils';

interface CurvedEdgeProps {
  /** Additional content added to the edge */
  children?: React.ReactNode;
  /** Additional classes added to the edge */
  className?: string;
  /** The graph edge element to represent */
  element: GraphElement;
  /** The style of the edge. Defaults to the style set on the Edge's model */
  edgeStyle?: EdgeStyle;
  /** The duration in seconds for the edge animation. Defaults to the animationSpeed set on the Edge's model */
  animationDuration?: number;
  /** The terminal type to use for the edge start */
  startTerminalType?: EdgeTerminalType;
  /** Additional classes added to the start terminal */
  startTerminalClass?: string;
  /** The status to indicate on the start terminal */
  startTerminalStatus?: NodeStatus;
  /** The size of the start terminal */
  startTerminalSize?: number;
  /** The terminal type to use for the edge end */
  endTerminalType?: EdgeTerminalType;
  /** Additional classes added to the end terminal */
  endTerminalClass?: string;
  /** The status to indicate on the end terminal */
  endTerminalStatus?: NodeStatus;
  /** The size of the end terminal */
  endTerminalSize?: number;
  /** Flag indicating if the element is selected. Part of WithSelectionProps */
  selected?: boolean;
  /** Function to call when the element should become selected (or deselected). Part of WithSelectionProps */
  onSelect?: OnSelect;
  /** Curve offset for the curved path. Higher values create more pronounced curves. Default: 80 */
  curveOffset?: number;
}

type CurvedEdgeInnerProps = Omit<CurvedEdgeProps, 'element'> & { element: Edge };

/**
 * Creates a curved SVG path between two points that mimics data lineage flow
 * @param startPoint - The starting point
 * @param endPoint - The ending point
 * @param bendpoints - Any intermediate bend points
 * @param curveOffset - How much to curve the line (default: 50)
 * @returns SVG path string
 */
const createCurvedPath = (
  startPoint: Point,
  endPoint: Point,
  bendpoints: Point[] = [],
  curveOffset = 80,
): string => {
  // If we have bendpoints, use them to create a multi-segment curved path
  if (bendpoints.length > 0) {
    let path = `M${startPoint.x} ${startPoint.y}`;
    let prevPoint = startPoint;

    bendpoints.forEach((bendpoint) => {
      const dx = bendpoint.x - prevPoint.x;

      // Create horizontal-first flow
      const controlDistance = Math.abs(dx) * 0.5;
      const controlX1 = prevPoint.x + Math.min(controlDistance, curveOffset);
      const controlY1 = prevPoint.y;
      const controlX2 = bendpoint.x - Math.min(controlDistance, curveOffset);
      const controlY2 = bendpoint.y;

      path += ` C${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${bendpoint.x} ${bendpoint.y}`;
      prevPoint = bendpoint;
    });

    // Final curve to end point
    const finalDx = endPoint.x - prevPoint.x;
    const finalControlDistance = Math.abs(finalDx) * 0.5;
    const finalControlX1 = prevPoint.x + Math.min(finalControlDistance, curveOffset);
    const finalControlY1 = prevPoint.y;
    const finalControlX2 = endPoint.x - Math.min(finalControlDistance, curveOffset);
    const finalControlY2 = endPoint.y;

    path += ` C${finalControlX1} ${finalControlY1}, ${finalControlX2} ${finalControlY2}, ${endPoint.x} ${endPoint.y}`;
    return path;
  }

  // Create a smooth S-curve that flows horizontally first, like in data lineage diagrams
  const dx = endPoint.x - startPoint.x;

  // Calculate control points for horizontal-first flow
  // The curve should start horizontally and end horizontally
  const horizontalDistance = Math.abs(dx);

  // Adaptive control distance based on both horizontal and vertical separation
  const baseControlDistance = Math.max(horizontalDistance * 0.4, 80);
  const controlDistance = Math.min(baseControlDistance, 150); // Cap the maximum curve

  // For very close nodes, reduce the curve to avoid over-curving
  const distanceRatio = Math.min(horizontalDistance / 200, 1);
  const adaptiveControlDistance = controlDistance * distanceRatio;

  // First control point: move horizontally from start
  const controlX1 = startPoint.x + (dx > 0 ? adaptiveControlDistance : -adaptiveControlDistance);
  const controlY1 = startPoint.y;

  // Second control point: move horizontally toward end
  const controlX2 = endPoint.x - (dx > 0 ? adaptiveControlDistance : -adaptiveControlDistance);
  const controlY2 = endPoint.y;

  return `M${startPoint.x} ${startPoint.y} C${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endPoint.x} ${endPoint.y}`;
};

const CurvedEdgeInner: React.FunctionComponent<CurvedEdgeInnerProps> = observer(
  ({
    element,
    edgeStyle,
    animationDuration,
    startTerminalType = EdgeTerminalType.none,
    startTerminalClass,
    startTerminalStatus,
    startTerminalSize = 14,
    endTerminalType = EdgeTerminalType.directional,
    endTerminalClass,
    endTerminalStatus,
    endTerminalSize = 6,
    children,
    className,
    selected,
    onSelect,
    curveOffset = 80,
  }) => {
    const startPoint = element.getStartPoint();
    const endPoint = element.getEndPoint();

    // If the edge connects to nodes in a collapsed group don't draw
    const sourceParent = getClosestVisibleParent(element.getSource());
    const targetParent = getClosestVisibleParent(element.getTarget());
    if (
      sourceParent &&
      isNode(sourceParent) &&
      sourceParent.isCollapsed() &&
      sourceParent === targetParent
    ) {
      return null;
    }

    const groupClassName = css(
      styles.topologyEdge,
      className,
      selected && 'pf-m-selected',
      endTerminalStatus && StatusModifier[endTerminalStatus],
    );

    const edgeAnimationDuration =
      animationDuration ?? getEdgeAnimationDuration(element.getEdgeAnimationSpeed());
    const linkClassName = css(
      styles.topologyEdgeLink,
      getEdgeStyleClassModifier(edgeStyle || element.getEdgeStyle()),
    );

    const bendpoints = element.getBendpoints();

    // Create curved path instead of straight lines
    const d = createCurvedPath(startPoint, endPoint, bendpoints, curveOffset);

    const bgStartPoint =
      startTerminalType === EdgeTerminalType.none
        ? [startPoint.x, startPoint.y]
        : getConnectorStartPoint(bendpoints[0] || endPoint, startPoint, startTerminalSize);
    const bgEndPoint =
      endTerminalType === EdgeTerminalType.none
        ? [endPoint.x, endPoint.y]
        : getConnectorStartPoint(
            bendpoints[bendpoints.length - 1] || startPoint,
            endPoint,
            endTerminalSize,
          );

    // Create background curved path as well
    const backgroundPath = createCurvedPath(
      new Point(bgStartPoint[0], bgStartPoint[1]),
      new Point(bgEndPoint[0], bgEndPoint[1]),
      bendpoints,
      curveOffset,
    );

    return (
      <Layer>
        <g data-test-id="edge-handler" className={groupClassName} onClick={onSelect}>
          <path className={css(styles.topologyEdgeBackground)} d={backgroundPath} />
          <path
            className={linkClassName}
            d={d}
            style={{ animationDuration: `${edgeAnimationDuration}s` }}
          />
          <DefaultConnectorTerminal
            className={startTerminalClass}
            isTarget={false}
            edge={element}
            size={startTerminalSize}
            terminalType={startTerminalType}
            status={startTerminalStatus}
          />
          <DefaultConnectorTerminal
            className={endTerminalClass}
            isTarget
            edge={element}
            size={endTerminalSize}
            terminalType={endTerminalType}
            status={endTerminalStatus}
          />
          {children}
        </g>
      </Layer>
    );
  },
);

const CurvedEdge: React.FunctionComponent<CurvedEdgeProps> = ({
  element,
  startTerminalType = EdgeTerminalType.none,
  startTerminalSize = 14,
  endTerminalType = EdgeTerminalType.directional,
  endTerminalSize = 6,
  curveOffset = 80,
  ...rest
}: CurvedEdgeProps) => {
  if (!isEdge(element)) {
    throw new Error('CurvedEdge must be used only on Edge elements');
  }
  return (
    <CurvedEdgeInner
      element={element}
      startTerminalType={startTerminalType}
      startTerminalSize={startTerminalSize}
      endTerminalType={endTerminalType}
      endTerminalSize={endTerminalSize}
      curveOffset={curveOffset}
      {...rest}
    />
  );
};

export default CurvedEdge;
