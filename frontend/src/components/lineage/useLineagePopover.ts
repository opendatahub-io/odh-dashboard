import { useState, useCallback, useEffect, useRef } from 'react';
import { LineageNode, LineageData } from '@odh-dashboard/feature-store/screens/lineage/types';
import { Visualization, GRAPH_LAYOUT_END_EVENT } from '@patternfly/react-topology';

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
  controller: Visualization | null;
  enabled?: boolean;
}

/**
 * Hook to manage lineage node popover state and positioning
 */
export const useLineagePopover = ({
  data,
  controller,
  enabled = true,
}: UseLineagePopoverProps): UseLineagePopoverReturn => {
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const [isPopoverVisible, setIsPopoverVisible] = useState(false);
  const activeNodeIdRef = useRef<string | null>(null);

  // Cache DOM elements and calculations for performance
  const domCacheRef = useRef<{
    svgElement: SVGSVGElement | null;
    lastNodeId: string | null;
    lastElement: Element | null;
  }>({
    svgElement: null,
    lastNodeId: null,
    lastElement: null,
  });

  // Clear cache when data changes
  useEffect(() => {
    domCacheRef.current = { svgElement: null, lastNodeId: null, lastElement: null };
  }, [data]);

  // Function to calculate screen position from a topology node
  const getNodeScreenPosition = useCallback(
    (nodeId: string): PopoverPosition | null => {
      if (!controller) return null;

      try {
        const cache = domCacheRef.current;

        // Method 1: Try cached element first if it's the same node
        if (cache.lastNodeId === nodeId && cache.lastElement) {
          const rect = cache.lastElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            };
          }
        }

        // Method 2: Find DOM element with optimized selectors
        const candidateSelectors = [`[data-id="${nodeId}"]`, `g[data-id="${nodeId}"]`];

        for (const selector of candidateSelectors) {
          const nodeElement = document.querySelector(selector);
          if (nodeElement) {
            const rect = nodeElement.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              // Cache for next time
              cache.lastNodeId = nodeId;
              cache.lastElement = nodeElement;
              return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              };
            }
          }
        }

        // Method 3: Fast SVG coordinate transformation
        const controllerNode = controller.getNodeById(nodeId);
        if (controllerNode) {
          const bounds = controllerNode.getBounds();

          // Use cached SVG element or find it
          let { svgElement } = cache;
          if (!svgElement) {
            const element = document.querySelector('.pf-topology__graph svg');
            if (element instanceof SVGSVGElement) {
              svgElement = element;
              cache.svgElement = svgElement;
            }
          }

          if (svgElement) {
            // Calculate node center in graph coordinates
            const nodeCenterX = bounds.x + bounds.width / 2;
            const nodeCenterY = bounds.y + bounds.height / 2;

            // Use the most efficient transformation method
            const ctm = svgElement.getScreenCTM();
            if (ctm) {
              const screenX = ctm.a * nodeCenterX + ctm.c * nodeCenterY + ctm.e;
              const screenY = ctm.b * nodeCenterX + ctm.d * nodeCenterY + ctm.f;

              return {
                x: screenX,
                y: screenY,
              };
            }
          }
        }

        return null;
      } catch (error) {
        // Clear cache on error
        domCacheRef.current = { svgElement: null, lastNodeId: null, lastElement: null };
        console.warn('Failed to calculate node position:', error);
        return null;
      }
    },
    [controller],
  );

  // Function to update popover position for the active node
  const updatePopoverPosition = useCallback(() => {
    if (!activeNodeIdRef.current || !isPopoverVisible) return;

    const newPosition = getNodeScreenPosition(activeNodeIdRef.current);
    if (newPosition) {
      // Fast edge detection with minimal calculations
      const popoverWidth = 400;
      const popoverHeight = 300;
      const margin = 20;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      let { x, y } = newPosition;

      // Fast boundary checks
      if (x + popoverWidth + margin > screenWidth) {
        x = Math.max(margin, x - popoverWidth);
      }
      if (y + popoverHeight + margin > screenHeight) {
        y = Math.max(margin, y - popoverHeight);
      }

      // Ensure minimum margins
      x = Math.max(margin, x);
      y = Math.max(margin, y);

      // Only update if position actually changed significantly (reduce unnecessary renders)
      setPopoverPosition((current) => {
        if (!current || Math.abs(current.x - x) > 1 || Math.abs(current.y - y) > 1) {
          return { x, y };
        }
        return current;
      });
    }
  }, [getNodeScreenPosition, isPopoverVisible]);

  const showPopover = useCallback(
    (
      nodeId: string,
      clickEvent?: React.MouseEvent | MouseEvent | { clientX: number; clientY: number },
    ) => {
      if (!enabled) return;

      // Find the node data
      const node = data.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Store the active node ID for position tracking
      activeNodeIdRef.current = nodeId;

      // Try to get dynamic position from the node element first
      let position = getNodeScreenPosition(nodeId);

      // Fallback to click coordinates if dynamic positioning fails
      if (!position && clickEvent) {
        position = {
          x: clickEvent.clientX,
          y: clickEvent.clientY,
        };
      }

      // Final fallback to center of screen
      if (!position) {
        position = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
      }

      // Adjust position to avoid screen edges
      const popoverWidth = 400; // Approximate popover width
      const popoverHeight = 300; // Approximate popover height
      const margin = 20; // Margin from screen edge

      // Create a working copy for adjustments
      const adjustedPosition = { ...position };

      // Adjust horizontal position
      if (adjustedPosition.x + popoverWidth + margin > window.innerWidth) {
        adjustedPosition.x = Math.max(margin, adjustedPosition.x - popoverWidth);
      }

      // Adjust vertical position
      if (adjustedPosition.y + popoverHeight + margin > window.innerHeight) {
        adjustedPosition.y = Math.max(margin, adjustedPosition.y - popoverHeight);
      }

      // Ensure position is never negative
      adjustedPosition.x = Math.max(margin, adjustedPosition.x);
      adjustedPosition.y = Math.max(margin, adjustedPosition.y);

      setSelectedNode(node);
      setPopoverPosition(adjustedPosition);
      setIsPopoverVisible(true);
    },
    [data.nodes, enabled, getNodeScreenPosition],
  );

  const hidePopover = useCallback(() => {
    activeNodeIdRef.current = null;
    setSelectedNode(null);
    setPopoverPosition(null);
    setIsPopoverVisible(false);
    // Clear DOM cache when hiding popover
    domCacheRef.current = { svgElement: null, lastNodeId: null, lastElement: null };
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

  // Update popover position when topology changes (pan, zoom, layout changes)
  useEffect(() => {
    if (!controller || !isPopoverVisible) return;

    let animationFrameId: number;
    let isUpdating = false;

    const immediateUpdate = () => {
      if (isUpdating) return;
      isUpdating = true;

      updatePopoverPosition();

      // Schedule next update
      animationFrameId = requestAnimationFrame(() => {
        isUpdating = false;
      });
    };

    // Listen for layout changes
    controller.addEventListener(GRAPH_LAYOUT_END_EVENT, immediateUpdate);

    // Find the SVG element directly for better performance
    const svgElement = document.querySelector('.pf-topology__graph svg');
    const graphContainer = document.querySelector('.pf-topology__graph');

    if (svgElement && graphContainer) {
      // Listen directly on the SVG for the most responsive updates
      const handleTransformChange = () => {
        immediateUpdate();
      };

      // Listen for events that cause immediate transformations
      const immediateEvents = ['wheel', 'mousedown'];

      immediateEvents.forEach((eventType) => {
        svgElement.addEventListener(eventType, handleTransformChange, { passive: true });
      });

      // Track mouse movement for smooth following during drag
      let isMouseDown = false;

      const handleMouseDown = () => {
        isMouseDown = true;
      };

      const handleMouseUp = () => {
        isMouseDown = false;
      };

      const handleMouseMove = () => {
        if (isMouseDown) {
          immediateUpdate();
        }
      };

      svgElement.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mouseup', handleMouseUp);
      svgElement.addEventListener('mousemove', handleMouseMove, { passive: true });

      // Use MutationObserver to watch for transform attribute changes on the SVG
      const observer = new MutationObserver(() => {
        immediateUpdate();
      });

      observer.observe(svgElement, {
        attributes: true,
        attributeFilter: ['transform', 'viewBox'],
        subtree: true,
      });

      // Continuous updates only during active interaction
      let continuousUpdateId: number;

      const startContinuousUpdates = () => {
        if (continuousUpdateId) return;

        const continuousUpdate = () => {
          immediateUpdate();
          continuousUpdateId = requestAnimationFrame(continuousUpdate);
        };

        continuousUpdateId = requestAnimationFrame(continuousUpdate);
      };

      const stopContinuousUpdates = () => {
        if (continuousUpdateId) {
          cancelAnimationFrame(continuousUpdateId);
          continuousUpdateId = 0;
        }
      };

      // Start continuous updates on interaction, stop after delay
      let stopTimeout: NodeJS.Timeout;

      const handleInteractionStart = () => {
        startContinuousUpdates();
        clearTimeout(stopTimeout);
      };

      const handleInteractionEnd = () => {
        clearTimeout(stopTimeout);
        stopTimeout = setTimeout(stopContinuousUpdates, 100); // Stop after 100ms of inactivity
      };

      svgElement.addEventListener('wheel', handleInteractionStart, { passive: true });
      svgElement.addEventListener('mousedown', handleInteractionStart);
      document.addEventListener('mouseup', handleInteractionEnd);

      // Watch for container resize
      const resizeObserver = new ResizeObserver(immediateUpdate);
      resizeObserver.observe(graphContainer);

      // Window resize
      window.addEventListener('resize', immediateUpdate);

      return () => {
        controller.removeEventListener(GRAPH_LAYOUT_END_EVENT, immediateUpdate);

        immediateEvents.forEach((eventType) => {
          svgElement.removeEventListener(eventType, handleTransformChange);
        });

        svgElement.removeEventListener('mousedown', handleMouseDown);
        svgElement.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        svgElement.removeEventListener('wheel', handleInteractionStart);
        svgElement.removeEventListener('mousedown', handleInteractionStart);
        document.removeEventListener('mouseup', handleInteractionEnd);

        observer.disconnect();
        resizeObserver.disconnect();
        window.removeEventListener('resize', immediateUpdate);

        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        if (continuousUpdateId) {
          cancelAnimationFrame(continuousUpdateId);
        }
        clearTimeout(stopTimeout);
      };
    }

    // Fallback for basic updates
    const fallbackId = setInterval(updatePopoverPosition, 100);
    return () => {
      controller.removeEventListener(GRAPH_LAYOUT_END_EVENT, immediateUpdate);
      clearInterval(fallbackId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [controller, isPopoverVisible, updatePopoverPosition]);

  return {
    selectedNode,
    popoverPosition,
    isPopoverVisible,
    showPopover,
    hidePopover,
  };
};
