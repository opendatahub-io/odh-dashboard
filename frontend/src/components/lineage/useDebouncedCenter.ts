import { useCallback, useRef } from 'react';
import type { Visualization } from '@patternfly/react-topology';

/**
 * Hook that provides a debounced centering function to prevent race conditions
 * when multiple components try to center the lineage graph simultaneously
 */
export const useDebouncedCenter = (
  controller: Visualization | null,
): {
  debouncedCenter: () => void;
  debouncedPanToNode: (nodeId: string) => void;
  cleanup: () => void;
} => {
  const centerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCenter = useCallback(() => {
    if (!controller) return;

    if (centerTimeoutRef.current) {
      clearTimeout(centerTimeoutRef.current);
    }

    centerTimeoutRef.current = setTimeout(() => {
      try {
        controller.getGraph().fit(50);
      } catch (e) {
        // Silently handle errors
      } finally {
        centerTimeoutRef.current = null;
      }
    }, 200);
  }, [controller]);

  const debouncedPanToNode = useCallback(
    (nodeId: string) => {
      if (!controller) return;

      if (centerTimeoutRef.current) {
        clearTimeout(centerTimeoutRef.current);
      }

      centerTimeoutRef.current = setTimeout(() => {
        try {
          const node = controller.getNodeById(nodeId);
          if (node) {
            controller.getGraph().panIntoView(node, {
              offset: 20,
              minimumVisible: 100,
            });
          }
        } catch (e) {
          // Silently handle errors
        } finally {
          centerTimeoutRef.current = null;
        }
      }, 200);
    },
    [controller],
  );

  const cleanup = useCallback(() => {
    if (centerTimeoutRef.current) {
      clearTimeout(centerTimeoutRef.current);
      centerTimeoutRef.current = null;
    }
  }, []);

  return { debouncedCenter, debouncedPanToNode, cleanup };
};
