import React, { useState, useCallback } from 'react';
import { SELECTION_EVENT, Visualization } from '@patternfly/react-topology';
import { findConnectedElements } from './graphUtils';
import { TopologyEdgeModel } from './types';

interface UseLineageSelectionProps {
  controller: Visualization | null;
  edges: TopologyEdgeModel[];
  onNodeSelect?: (nodeId: string | null) => void;
}

interface UseLineageSelectionReturn {
  selectedIds: string[];
  highlightedIds: string[];
}

/**
 * Custom hook to manage lineage selection and highlighting logic
 */
export const useLineageSelection = ({
  controller,
  edges,
  onNodeSelect,
}: UseLineageSelectionProps): UseLineageSelectionReturn => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  const handleSelection = useCallback(
    (ids: string[]) => {
      setSelectedIds(ids);

      // If a node is selected, highlight its connections
      if (ids.length > 0) {
        const selectedId = ids[0];
        const connectedElements = findConnectedElements(selectedId, edges);
        setHighlightedIds(connectedElements);
        // Call external callback if provided
        onNodeSelect?.(selectedId);
      } else {
        // Clear highlighting when nothing is selected
        setHighlightedIds([]);
        onNodeSelect?.(null);
      }
    },
    [edges, onNodeSelect],
  );

  React.useEffect(() => {
    if (controller) {
      controller.addEventListener(SELECTION_EVENT, handleSelection);

      return () => {
        controller.removeEventListener(SELECTION_EVENT, handleSelection);
      };
    }

    return undefined;
  }, [controller, handleSelection]);

  // Update controller state when highlightedIds changes
  React.useEffect(() => {
    if (controller) {
      controller.setState({ highlightedIds });
    }
  }, [controller, highlightedIds]);

  return {
    selectedIds,
    highlightedIds,
  };
};
