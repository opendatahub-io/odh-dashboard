import { useState, useCallback, useEffect, useRef } from 'react';
import { useLineageClick } from './LineageClickContext';
import { LineageData, LineageNode, PopoverPosition } from './types';

export interface UseLineagePopoverReturn {
  selectedNode: LineageNode | null;
  popoverPosition: PopoverPosition | null;
  isPopoverVisible: boolean;
  showPopover: (nodeId: string, clickPosition?: { x: number; y: number }) => void;
  hidePopover: () => void;
}

interface UseLineagePopoverProps {
  data: LineageData;
  enabled?: boolean;
}

/**
 * Ref-based popover hook to prevent race conditions from multiple rapid clicks
 * Uses refs to maintain stable references and prevent stale closure issues
 */
export const useLineagePopover = ({
  data,
  enabled = true,
}: UseLineagePopoverProps): UseLineagePopoverReturn => {
  const { setClickPosition } = useLineageClick();
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);

  // Debounced state updates to prevent race conditions
  const stateUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stateRef = useRef<{
    isProcessing: boolean;
    currentOperation: AbortController | null;
    lastRequestId: number;
    lastShowTime: number;
    activeNodeId: string | null;
  }>({
    isProcessing: false,
    currentOperation: null,
    lastRequestId: 0,
    lastShowTime: 0,
    activeNodeId: null,
  });

  const activeNodeIdRef = useRef<string | null>(null);
  const lastShowTimeRef = useRef<number>(0);
  const lastSelectedNodeRef = useRef<LineageNode | null>(null);
  const lastClickPositionRef = useRef<{ x: number; y: number } | null>(null);
  const justShowedPopoverRef = useRef<boolean>(false);
  const timeoutRefs = useRef<{
    repositioning: NodeJS.Timeout | null;
    justShowed: NodeJS.Timeout | null;
  }>({ repositioning: null, justShowed: null });
  const isCleanedUpRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Debounced state update to prevent race conditions
  const debouncedStateUpdate = useCallback(
    (node: LineageNode | null, position: PopoverPosition | null, visible: boolean) => {
      if (stateUpdateTimeoutRef.current) {
        clearTimeout(stateUpdateTimeoutRef.current);
      }

      stateUpdateTimeoutRef.current = setTimeout(() => {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setSelectedNode(node);
          setPopoverPosition(position);
          setIsPopoverVisible(visible);
        }
        stateUpdateTimeoutRef.current = null;
      }, 0); // Use 0ms to batch updates in the same tick
    },
    [],
  );

  const showPopover = useCallback(
    (nodeId: string, clickPosition?: { x: number; y: number }) => {
      if (!enabled) {
        return;
      }

      const node = data.nodes.find((n) => n.id === nodeId);
      if (!node) {
        return;
      }

      if (clickPosition && lastClickPositionRef.current) {
        const distance = Math.sqrt(
          Math.pow(clickPosition.x - lastClickPositionRef.current.x, 2) +
            Math.pow(clickPosition.y - lastClickPositionRef.current.y, 2),
        );
        if (distance < 5) {
          return;
        }
      }

      if (activeNodeIdRef.current === nodeId && isPopoverVisible) {
        return;
      }

      const now = Date.now();
      if (now - lastShowTimeRef.current < 100) {
        return;
      }
      lastShowTimeRef.current = now;

      if (stateRef.current.currentOperation) {
        stateRef.current.currentOperation.abort();
      }

      const abortController = new AbortController();
      stateRef.current.currentOperation = abortController;

      activeNodeIdRef.current = nodeId;

      if (clickPosition) {
        lastClickPositionRef.current = clickPosition;
      }

      const dummyPosition = { x: 0, y: 0 };

      debouncedStateUpdate(node, dummyPosition, true);
      justShowedPopoverRef.current = true;

      lastSelectedNodeRef.current = node;

      requestAnimationFrame(() => {
        if (abortController.signal.aborted) {
          return;
        }
        stateRef.current.currentOperation = null;
      });
    },
    [data.nodes, enabled, isPopoverVisible],
  );

  const hidePopover = useCallback(() => {
    // Cancel any pending operation
    if (stateRef.current.currentOperation) {
      stateRef.current.currentOperation.abort();
      stateRef.current.currentOperation = null;
    }

    activeNodeIdRef.current = null;
    lastClickPositionRef.current = null;
    justShowedPopoverRef.current = false;
    debouncedStateUpdate(null, null, false);
  }, []);

  const findNodeElement = useCallback((nodeId: string): Element | null => {
    const selectors = [
      `[data-id="${nodeId}"] rect`,
      `[data-id="${nodeId}"]`,
      `g[data-id="${nodeId}"]`,
      `g[data-id="${nodeId}"] rect`,
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  }, []);

  /**
   * Gets the current screen position of a node element
   */
  const getNodeScreenPosition = useCallback(
    (nodeId: string): { x: number; y: number } | null => {
      const element = findNodeElement(nodeId);
      if (!element) return null;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    },
    [findNodeElement],
  );

  /**
   * Checks if two positions are significantly different
   */
  const hasPositionChanged = useCallback(
    (pos1: { x: number; y: number }, pos2: { x: number; y: number }): boolean => {
      const threshold = 15;
      return Math.abs(pos1.x - pos2.x) > threshold || Math.abs(pos1.y - pos2.y) > threshold;
    },
    [],
  );

  /**
   * Ref-based position update with race condition prevention
   */
  const updatePopoverPosition = useCallback(
    (nodeId: string, newPosition: { x: number; y: number }) => {
      // Only allow one operation at a time
      if (stateRef.current.isProcessing) {
        return;
      }

      // Check if this is still the active node (different node clicked)
      if (activeNodeIdRef.current !== nodeId) {
        return;
      }

      const element = findNodeElement(nodeId);
      if (!element) {
        return;
      }

      // Cancel any pending operation
      if (stateRef.current.currentOperation) {
        stateRef.current.currentOperation.abort();
      }

      // Set processing flag
      stateRef.current.isProcessing = true;
      stateRef.current.currentOperation = new AbortController();

      const abortController = stateRef.current.currentOperation;

      setIsPopoverVisible(false);

      // Use requestAnimationFrame for better performance and consistency
      requestAnimationFrame(() => {
        if (abortController.signal.aborted) {
          stateRef.current.isProcessing = false;
          return;
        }

        // Double-check node is still active
        if (activeNodeIdRef.current !== nodeId) {
          stateRef.current.isProcessing = false;
          return;
        }

        // Use requestAnimationFrame to avoid MobX strict mode issues
        requestAnimationFrame(() => {
          setClickPosition({
            x: newPosition.x,
            y: newPosition.y,
            pillElement: element,
          });

          // Final check before showing popover
          requestAnimationFrame(() => {
            if (abortController.signal.aborted) {
              stateRef.current.isProcessing = false;
              return;
            }

            if (activeNodeIdRef.current !== nodeId) {
              stateRef.current.isProcessing = false;
              return;
            }

            setIsPopoverVisible(true);
            stateRef.current.isProcessing = false;
            stateRef.current.currentOperation = null;
          });
        });
      });
    },
    [findNodeElement, setClickPosition],
  );

  // Position tracking effect
  useEffect(() => {
    if (!selectedNode) return;

    // Reset cleanup flag for new effect
    isCleanedUpRef.current = false;

    let lastKnownPosition = { x: 0, y: 0 };
    let isRepositioning = false;

    const checkAndRepositionPopover = () => {
      if (isCleanedUpRef.current || isRepositioning) return;

      const nodeToReposition = lastSelectedNodeRef.current;
      if (!nodeToReposition) return;

      const currentPosition = getNodeScreenPosition(nodeToReposition.id);
      if (!currentPosition) return;

      // Only update if position changed significantly and we have a previous position
      if (lastKnownPosition.x !== 0 && hasPositionChanged(currentPosition, lastKnownPosition)) {
        isRepositioning = true;
        updatePopoverPosition(nodeToReposition.id, currentPosition);

        // Reset repositioning flag after update completes
        if (timeoutRefs.current.repositioning) {
          clearTimeout(timeoutRefs.current.repositioning);
        }
        timeoutRefs.current.repositioning = setTimeout(() => {
          isRepositioning = false;
          timeoutRefs.current.repositioning = null;
        }, 150);
      }

      lastKnownPosition = currentPosition;
    };

    const svgContainer = document.querySelector('.pf-topology-visualization-surface');

    if (!svgContainer) return;

    let updateTimer: NodeJS.Timeout;

    const throttledCheck = () => {
      if (isCleanedUpRef.current) return;
      clearTimeout(updateTimer);
      updateTimer = setTimeout(checkAndRepositionPopover, 100);
    };

    const immediateCheck = () => {
      if (isCleanedUpRef.current) return;
      clearTimeout(updateTimer);
      // Don't check position immediately after popover becomes visible to avoid interference
      if (justShowedPopoverRef.current) {
        // Reset the flag after a short delay
        if (timeoutRefs.current.justShowed) {
          clearTimeout(timeoutRefs.current.justShowed);
        }
        timeoutRefs.current.justShowed = setTimeout(() => {
          justShowedPopoverRef.current = false;
          timeoutRefs.current.justShowed = null;
        }, 200);
        return;
      }
      checkAndRepositionPopover();
    };

    // Listen for movement events (throttled)
    svgContainer.addEventListener('mousemove', throttledCheck, { passive: true });
    svgContainer.addEventListener('wheel', throttledCheck, { passive: true });

    // Listen for drag end events (immediate)
    document.addEventListener('mouseup', immediateCheck, { passive: true });
    svgContainer.addEventListener('mouseup', immediateCheck, { passive: true });
    svgContainer.addEventListener('mouseleave', immediateCheck, { passive: true });

    // Also check on any interaction end
    document.addEventListener('click', immediateCheck, { passive: true });

    // Initial position setup
    setTimeout(checkAndRepositionPopover, 100);

    return () => {
      isCleanedUpRef.current = true;
      clearTimeout(updateTimer);
      if (timeoutRefs.current.repositioning) {
        clearTimeout(timeoutRefs.current.repositioning);
        timeoutRefs.current.repositioning = null;
      }
      if (timeoutRefs.current.justShowed) {
        clearTimeout(timeoutRefs.current.justShowed);
        timeoutRefs.current.justShowed = null;
      }
      if (stateUpdateTimeoutRef.current) {
        clearTimeout(stateUpdateTimeoutRef.current);
        stateUpdateTimeoutRef.current = null;
      }
      svgContainer.removeEventListener('mousemove', throttledCheck);
      svgContainer.removeEventListener('wheel', throttledCheck);
      svgContainer.removeEventListener('mouseup', immediateCheck);
      svgContainer.removeEventListener('mouseleave', immediateCheck);
      document.removeEventListener('mouseup', immediateCheck);
      document.removeEventListener('click', immediateCheck);
    };
  }, [selectedNode, getNodeScreenPosition, hasPositionChanged, updatePopoverPosition]);

  // Handle clicks outside the popover to close it
  useEffect(() => {
    if (!isPopoverVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      const { target } = event;
      if (!target || !(target instanceof Element)) {
        return;
      }

      // Check if click is on a lineage node (SVG elements) - this is the key fix
      if (target.closest('g[class*="pf-topology"]') || target.closest('.pf-topology__graph')) {
        return; // Don't close on node clicks
      }

      // Check if click is inside popover - comprehensive selectors for PatternFly Popover
      if (
        target.closest('[role="dialog"]') ||
        target.closest('.pf-c-popover') ||
        target.closest('[data-testid*="popover"]') ||
        target.closest('.pf-v5-c-popover') ||
        target.closest('[class*="popover"]') ||
        target.closest('[class*="Popover"]') ||
        target.closest('[aria-describedby]') ||
        target.closest('[aria-labelledby]')
      ) {
        return; // Don't close on popover clicks
      }

      hidePopover();
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hidePopover();
      }
    };

    // Use mousedown instead of click to avoid the same event that opened the popover
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
