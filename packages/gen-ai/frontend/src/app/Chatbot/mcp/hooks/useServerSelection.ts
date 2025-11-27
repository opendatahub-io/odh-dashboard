import * as React from 'react';
import { MCPServer } from '~/app/types';

export interface UseServerSelectionReturn {
  selectedServers: MCPServer[];
  isInitialLoadComplete: boolean;
  setSelectedServers: React.Dispatch<React.SetStateAction<MCPServer[]>>;
}

export interface UseServerSelectionProps {
  transformedServers: MCPServer[];
  initialSelectedServerIds?: string[];
  onSelectionChange?: (serverIds: string[]) => void;
}

/**
 * Hook for managing server selection with support for initial selection from route state.
 * Uses ref pattern to ensure one-time initialization.
 *
 * @param props - Configuration for server selection
 * @returns Object containing selection state and handlers
 */
const useServerSelection = ({
  transformedServers,
  initialSelectedServerIds,
  onSelectionChange,
}: UseServerSelectionProps): UseServerSelectionReturn => {
  const [selectedServers, setSelectedServers] = React.useState<MCPServer[]>([]);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = React.useState(false);
  const hasProcessedInitialSelection = React.useRef(false);

  // Handle initial selection from route state
  React.useEffect(() => {
    if (hasProcessedInitialSelection.current || transformedServers.length === 0) {
      return;
    }

    if (initialSelectedServerIds && initialSelectedServerIds.length > 0) {
      const serversToSelect = transformedServers.filter((server) =>
        initialSelectedServerIds.includes(server.id),
      );

      if (serversToSelect.length > 0) {
        const currentSelectedIds = new Set(selectedServers.map((s) => s.id));
        const newSelectedIds = new Set(serversToSelect.map((s) => s.id));

        const isDifferent =
          currentSelectedIds.size !== newSelectedIds.size ||
          [...currentSelectedIds].some((id) => !newSelectedIds.has(id));

        if (isDifferent) {
          setSelectedServers(serversToSelect);
        }
      }
      setIsInitialLoadComplete(true);
      hasProcessedInitialSelection.current = true;
    } else {
      setIsInitialLoadComplete(true);
      hasProcessedInitialSelection.current = true;
    }
  }, [transformedServers, initialSelectedServerIds, selectedServers]);

  // Notify parent of selection changes
  React.useEffect(() => {
    const selectedConnectionUrls = selectedServers.map((server) => server.id);

    if (transformedServers.length > 0) {
      onSelectionChange?.(selectedConnectionUrls);
    }
  }, [selectedServers, onSelectionChange, transformedServers.length]);

  return {
    selectedServers,
    isInitialLoadComplete,
    setSelectedServers,
  };
};

export default useServerSelection;
