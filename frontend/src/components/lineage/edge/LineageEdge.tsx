import React from 'react';
import {
  Edge,
  EdgeStyle,
  EdgeTerminalType,
  GraphElement,
  isEdge,
  NodeStatus,
  observer,
  Point,
} from '@patternfly/react-topology';
import { OnSelect } from '@patternfly/react-topology/dist/esm/behavior';
import { Layer } from '@patternfly/react-topology/dist/esm/components/layers';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-topology/dist/esm/css/topology-components';
import DefaultConnectorTerminal from '@patternfly/react-topology/dist/esm/components/edges/terminals/DefaultConnectorTerminal';
import StraightEndTerminal from './StraightEndTerminal';
import {
  useEdgeHighlighting,
  getEdgeHighlightStyles,
  getEdgeBackgroundStyles,
} from './edgeStateUtils';
import { getEdgeStyleConfig } from './edgeStyleUtils';
import { getEdgeVisibilityConfig } from './edgeVisibilityUtils';

interface LineageEdgeProps {
  children?: React.ReactNode;
  className?: string;
  element: GraphElement;
  edgeStyle?: EdgeStyle;
  animationDuration?: number;
  startTerminalType?: EdgeTerminalType;
  startTerminalClass?: string;
  startTerminalStatus?: NodeStatus;
  startTerminalSize?: number;
  endTerminalType?: EdgeTerminalType;
  endTerminalClass?: string;
  endTerminalStatus?: NodeStatus;
  endTerminalSize?: number;
  selected?: boolean;
  onSelect?: OnSelect;
  curvature?: number;
}

type LineageEdgeInnerProps = Omit<LineageEdgeProps, 'element'> & { element: Edge };

/**
 * Creates a smooth cubic Bézier curve path between two points
 * Optimized for horizontal lineage layouts with proper anchor awareness
 */
const createLineageBezierPath = (startPoint: Point, endPoint: Point, curvature = 0.4): string => {
  const dx = endPoint.x - startPoint.x;

  // Calculate control points for a smooth horizontal curve
  // The curvature determines how much the curve bends
  const controlDistance = Math.abs(dx) * curvature;

  const control1 = new Point(startPoint.x + controlDistance, startPoint.y);

  const control2 = new Point(endPoint.x - controlDistance, endPoint.y);

  return `M ${startPoint.x} ${startPoint.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${endPoint.x} ${endPoint.y}`;
};

const createBackgroundPath = (
  startPoint: Point,
  endPoint: Point,
  startTerminalType: EdgeTerminalType,
  endTerminalType: EdgeTerminalType,
  startTerminalSize: number,
  endTerminalSize: number,
  curvature: number,
): string => {
  const adjustedStart =
    startTerminalType !== EdgeTerminalType.none
      ? new Point(startPoint.x + startTerminalSize, startPoint.y)
      : startPoint;

  const adjustedEnd =
    endTerminalType !== EdgeTerminalType.none
      ? new Point(endPoint.x - endTerminalSize, endPoint.y)
      : endPoint;

  return createLineageBezierPath(adjustedStart, adjustedEnd, curvature);
};

const LineageEdgeInner: React.FunctionComponent<LineageEdgeInnerProps> = observer(
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
    curvature = 0.4,
  }) => {
    const startPoint = element.getStartPoint();
    const endPoint = element.getEndPoint();

    const { shouldRender, isPositioning } = getEdgeVisibilityConfig(element);
    if (!shouldRender) {
      return null;
    }

    const effectiveStartTerminalType = isPositioning ? EdgeTerminalType.none : startTerminalType;
    const effectiveEndTerminalType = isPositioning ? EdgeTerminalType.none : endTerminalType;

    const { isConnectedToSelection } = useEdgeHighlighting(element.getId(), selected);

    const { groupClassName, linkClassName, edgeAnimationDuration } = getEdgeStyleConfig({
      edgeStyle,
      animationDuration,
      className,
      selected,
      endTerminalStatus,
      isConnectedToSelection,
      elementEdgeStyle: element.getEdgeStyle(),
    });

    const mainPath = createLineageBezierPath(startPoint, endPoint, curvature);

    const backgroundPath = createBackgroundPath(
      startPoint,
      endPoint,
      effectiveStartTerminalType,
      effectiveEndTerminalType,
      startTerminalSize,
      endTerminalSize,
      curvature,
    );

    return (
      <Layer>
        <style>
          {`
            .lineage-terminal-light svg {
              fill: #A3A3A3 !important;
              stroke: #A3A3A3 !important;
              opacity: 0.8;
            }
            
            .pf-m-highlighted .lineage-terminal-light svg,
            .pf-m-selected .lineage-terminal-light svg {
              fill: #007bff !important;
              stroke: #007bff !important;
              opacity: 1;
            }
          `}
        </style>
        <g data-test-id="lineage-edge-handler" className={groupClassName} onClick={onSelect}>
          <path
            className={css(styles.topologyEdgeBackground)}
            d={backgroundPath}
            style={{
              ...getEdgeBackgroundStyles(isPositioning),
              strokeWidth: '12',
              stroke: 'transparent',
              opacity: isPositioning ? 0 : 0.1,
            }}
          />

          <path
            className={linkClassName}
            d={mainPath}
            style={{
              ...getEdgeHighlightStyles(
                isConnectedToSelection,
                isPositioning,
                edgeAnimationDuration,
                {
                  strokeColor: '#007bff',
                  strokeWidth: 2.5,
                  dropShadow: 'drop-shadow(0 0 4px rgba(0, 123, 255, 0.4))',
                },
              ),
              strokeWidth: '1.5',
              stroke: isConnectedToSelection ? '#007bff' : '#A3A3A3',
              fill: 'none',
              opacity: isPositioning ? 0 : 0.8,
            }}
          />

          <DefaultConnectorTerminal
            className={css(startTerminalClass, 'lineage-terminal-light')}
            isTarget={false}
            edge={element}
            size={startTerminalSize}
            terminalType={effectiveStartTerminalType}
            status={startTerminalStatus}
          />

          <StraightEndTerminal
            className={css(endTerminalClass, 'lineage-terminal-light')}
            isTarget
            edge={element}
            size={endTerminalSize}
            terminalType={effectiveEndTerminalType}
            status={endTerminalStatus}
          />

          {children}
        </g>
      </Layer>
    );
  },
);

const LineageEdge: React.FunctionComponent<LineageEdgeProps> = ({
  element,
  startTerminalType = EdgeTerminalType.none,
  startTerminalSize = 14,
  endTerminalType = EdgeTerminalType.directional,
  endTerminalSize = 6,
  curvature = 0.4,
  ...rest
}: LineageEdgeProps) => {
  if (!isEdge(element)) {
    throw new Error('LineageEdge must be used only on Edge elements');
  }
  return (
    <LineageEdgeInner
      element={element}
      startTerminalType={startTerminalType}
      startTerminalSize={startTerminalSize}
      endTerminalType={endTerminalType}
      endTerminalSize={endTerminalSize}
      curvature={curvature}
      {...rest}
    />
  );
};

export default LineageEdge;
