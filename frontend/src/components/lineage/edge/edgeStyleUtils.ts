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

export interface EdgeRenderConfig {
  edgeStyle?: EdgeStyle;
  animationDuration?: number;
  className?: string;
  selected?: boolean;
  endTerminalStatus?: NodeStatus;
  isConnectedToSelection?: boolean;
  elementEdgeStyle?: EdgeStyle;
}

const getEdgeGroupClassName = ({
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

const getEdgeLinkClassName = (edgeStyle?: EdgeStyle, elementEdgeStyle?: EdgeStyle): string => {
  const finalEdgeStyle = edgeStyle ?? elementEdgeStyle;
  return css(
    styles.topologyEdgeLink,
    finalEdgeStyle ? getEdgeStyleClassModifier(finalEdgeStyle) : undefined,
  );
};

const calculateEdgeAnimationDuration = (animationDuration?: number): number => {
  if (animationDuration !== undefined) {
    return animationDuration;
  }

  return 1;
};

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
