import { useState, useCallback, useEffect } from 'react';
import { LineageNode, LineageData } from '@odh-dashboard/feature-store/screens/lineage/types';

export interface PopoverPosition {
  x: number;
  y: number;
}

export interface UseLineagePopoverReturn {
  selectedNode: LineageNode | null;
  popoverPosition: PopoverPosition | null;
  isPopoverVisible: boolean;
  showPopover: (
    nodeId: string,
    clickEvent?: React.MouseEvent | MouseEvent | { clientX: number; clientY: number },
  ) => void;
  hidePopover: () => void;
}

interface UseLineagePopoverProps {
  data: LineageData;
  enabled?: boolean;
}

/**
 * Hook to manage lineage node popover state and positioning
 */
export const useLineagePopover = ({
  data,
  enabled = true,
}: UseLineagePopoverProps): UseLineagePopoverReturn => {
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);

  const showPopover = useCallback(
    (
      nodeId: string,
      clickEvent?: React.MouseEvent | MouseEvent | { clientX: number; clientY: number },
    ) => {
      if (!enabled) return;

      // Find the node data
      const node = data.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      let position: PopoverPosition;

      if (clickEvent) {
        // Use click event coordinates if available
        position = {
          x: clickEvent.clientX,
          y: clickEvent.clientY,
        };
      } else {
        // Fallback to center of screen if no click event
        position = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
      }

      // Adjust position to avoid screen edges
      const popoverWidth = 400; // Approximate popover width
      const popoverHeight = 300; // Approximate popover height
      const margin = 20; // Margin from screen edge

      // Adjust horizontal position
      if (position.x + popoverWidth + margin > window.innerWidth) {
        position.x = Math.max(margin, position.x - popoverWidth);
      }

      // Adjust vertical position
      if (position.y + popoverHeight + margin > window.innerHeight) {
        position.y = Math.max(margin, position.y - popoverHeight);
      }

      setSelectedNode(node);
      setPopoverPosition(position);
      setIsPopoverVisible(true);
    },
    [data.nodes, enabled],
  );

  const hidePopover = useCallback(() => {
    setSelectedNode(null);
    setPopoverPosition(null);
    setIsPopoverVisible(false);
  }, []);

  // Handle clicks outside the popover to close it
  useEffect(() => {
    if (!isPopoverVisible) return;

    const handleClickOutside = ({ target }: MouseEvent) => {
      // Close popover on outside click, but not on the original node click
      if (!target || !(target instanceof Element)) {
        return;
      }

      // Check if click is on a lineage node (SVG elements)
      if (target.closest('g[class*="pf-topology"]') || target.closest('.pf-topology__graph')) {
        return; // Don't close on node clicks
      }

      // Check if click is inside popover
      if (target.closest('[role="dialog"]') || target.closest('.pf-c-popover')) {
        return; // Don't close on popover clicks
      }

      hidePopover();
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hidePopover();
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isPopoverVisible, hidePopover]);

  return {
    selectedNode,
    popoverPosition,
    isPopoverVisible,
    showPopover,
    hidePopover,
  };
};
