import React from 'react';
import { useVisualizationController } from '@patternfly/react-topology';

export interface VisualizationState {
  highlightedIds?: string[];
  selectedIds?: string[];
  [key: string]: unknown;
}

/**
 * Custom hook to get edge highlighting state from the visualization controller
 */
export const useEdgeHighlighting = (
  elementId: string,
  selected?: boolean,
): {
  isHighlighted: boolean;
  isConnectedToSelection: boolean;
  highlightedIds: string[];
} => {
  const controller = useVisualizationController();
  const state = controller.getState();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const highlightedIds: string[] = (state as VisualizationState).highlightedIds || [];

  const isHighlighted = highlightedIds.includes(elementId);
  const isConnectedToSelection = isHighlighted && !selected;

  return {
    isHighlighted,
    isConnectedToSelection,
    highlightedIds,
  };
};

export interface EdgeHighlightConfig {
  strokeColor: string;
  strokeWidth: number;
  dropShadow: string;
}

export const DEFAULT_HIGHLIGHT_CONFIG: EdgeHighlightConfig = {
  strokeColor: '#007bff',
  strokeWidth: 3,
  dropShadow: 'drop-shadow(0 0 4px rgba(0, 123, 255, 0.4))',
};

export const getEdgeHighlightStyles = (
  isConnectedToSelection: boolean,
  isPositioningEdge: boolean,
  edgeAnimationDuration: number,
  config: EdgeHighlightConfig = DEFAULT_HIGHLIGHT_CONFIG,
): React.CSSProperties => {
  return {
    animationDuration: `${edgeAnimationDuration}s`,
    stroke: isConnectedToSelection ? config.strokeColor : undefined,
    strokeWidth: isConnectedToSelection ? config.strokeWidth : undefined,
    filter: isConnectedToSelection ? config.dropShadow : undefined,
    opacity: isPositioningEdge ? 0 : undefined,
  };
};

export const getEdgeBackgroundStyles = (isPositioningEdge: boolean): React.CSSProperties => {
  return {
    opacity: isPositioningEdge ? 0 : undefined,
    pointerEvents: 'none',
  };
};
