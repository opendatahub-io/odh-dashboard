import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-topology/dist/esm/css/topology-components';
import {
  EdgeStyle,
  NodeStatus,
  getEdgeStyleClassModifier,
  StatusModifier,
} from '@patternfly/react-topology';

export interface EdgeStyleConfig {
  className?: string;
  selected?: boolean;
  endTerminalStatus?: NodeStatus;
  isConnectedToSelection?: boolean;
}

/**
 * Generates the CSS class name for the edge group element
 */
export const getEdgeGroupClassName = ({
  className,
  selected,
  endTerminalStatus,
  isConnectedToSelection,
}: EdgeStyleConfig): string => {
  return css(
    styles.topologyEdge,
    className,
    selected && 'pf-m-selected',
    endTerminalStatus && StatusModifier[endTerminalStatus],
    isConnectedToSelection && 'pf-m-highlighted',
  );
};

/**
 * Generates the CSS class name for the edge link path
 */
export const getEdgeLinkClassName = (
  edgeStyle?: EdgeStyle,
  elementEdgeStyle?: EdgeStyle,
): string => {
  const finalEdgeStyle = edgeStyle ?? elementEdgeStyle;
  return css(
    styles.topologyEdgeLink,
    finalEdgeStyle ? getEdgeStyleClassModifier(finalEdgeStyle) : undefined,
  );
};

export const calculateEdgeAnimationDuration = (animationDuration?: number): number => {
  // If explicit duration is provided, use it
  if (animationDuration !== undefined) {
    return animationDuration;
  }

  return 1; // Default 1 second animation duration
};

export interface EdgeRenderConfig {
  edgeStyle?: EdgeStyle;
  animationDuration?: number;
  className?: string;
  selected?: boolean;
  endTerminalStatus?: NodeStatus;
  isConnectedToSelection?: boolean;
  elementEdgeStyle?: EdgeStyle;
}

/**
 * Function to get all styling information for an edge
 */
export const getEdgeStyleConfig = (
  config: EdgeRenderConfig,
): {
  groupClassName: string;
  linkClassName: string;
  edgeAnimationDuration: number;
} => {
  const groupClassName = getEdgeGroupClassName({
    className: config.className,
    selected: config.selected,
    endTerminalStatus: config.endTerminalStatus,
    isConnectedToSelection: config.isConnectedToSelection,
  });

  const linkClassName = getEdgeLinkClassName(config.edgeStyle, config.elementEdgeStyle);

  const edgeAnimationDuration = calculateEdgeAnimationDuration(config.animationDuration);

  return {
    groupClassName,
    linkClassName,
    edgeAnimationDuration,
  };
};
