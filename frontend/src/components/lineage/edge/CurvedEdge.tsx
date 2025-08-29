import React from 'react';
import {
  Edge,
  EdgeStyle,
  EdgeTerminalType,
  GraphElement,
  isEdge,
  NodeStatus,
  observer,
} from '@patternfly/react-topology';
import { OnSelect } from '@patternfly/react-topology/dist/esm/behavior';
import { Layer } from '@patternfly/react-topology/dist/esm/components/layers';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-topology/dist/esm/css/topology-components';
import DefaultConnectorTerminal from '@patternfly/react-topology/dist/esm/components/edges/terminals/DefaultConnectorTerminal';
import { getConnectorStartPoint } from '@patternfly/react-topology/dist/esm/components/edges/terminals/terminalUtils';
import StraightEndTerminal from './StraightEndTerminal';
import {
  useEdgeHighlighting,
  getEdgeHighlightStyles,
  getEdgeBackgroundStyles,
} from './edgeStateUtils';
import { getEdgeStyleConfig } from './edgeStyleUtils';
import { getEdgeVisibilityConfig } from './edgeVisibilityUtils';
import { calculateBackgroundPath, createCurvedPath } from './pathUtils';

interface CurvedEdgeProps {
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
  curveOffset?: number;
}

type CurvedEdgeInnerProps = Omit<CurvedEdgeProps, 'element'> & { element: Edge };

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

    const { shouldRender, isPositioning } = getEdgeVisibilityConfig(element);
    if (!shouldRender) {
      return null;
    }

    // Hide terminal pointers for positioning edges
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

    const bendpoints = element.getBendpoints();

    const d = createCurvedPath(startPoint, endPoint, bendpoints, curveOffset);

    const backgroundPath = calculateBackgroundPath(
      startPoint,
      endPoint,
      bendpoints,
      effectiveStartTerminalType,
      effectiveEndTerminalType,
      startTerminalSize,
      endTerminalSize,
      curveOffset,
      getConnectorStartPoint,
    );

    return (
      <Layer>
        <g data-test-id="edge-handler" className={groupClassName} onClick={onSelect}>
          <path
            className={css(styles.topologyEdgeBackground)}
            d={backgroundPath}
            style={getEdgeBackgroundStyles(isPositioning)}
          />
          <path
            className={linkClassName}
            d={d}
            style={getEdgeHighlightStyles(
              isConnectedToSelection,
              isPositioning,
              edgeAnimationDuration,
            )}
          />
          <DefaultConnectorTerminal
            className={startTerminalClass}
            isTarget={false}
            edge={element}
            size={startTerminalSize}
            terminalType={effectiveStartTerminalType}
            status={startTerminalStatus}
          />
          <StraightEndTerminal
            className={endTerminalClass}
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

const CurvedEdge: React.FunctionComponent<CurvedEdgeProps> = ({
  element,
  startTerminalType = EdgeTerminalType.none,
  startTerminalSize = 14,
  endTerminalType = EdgeTerminalType.directional,
  endTerminalSize = 6,
  curveOffset = 30,
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
