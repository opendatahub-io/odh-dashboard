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
  const hasReceivedInitialSelection = React.useRef(false);
  const unavailableSelectedIds = React.useRef(new Set<string>());
  // Last selection reported to the parent — distinguishes the parent's echo of our
  // own emissions from external selection resets
  const lastEmittedIdsRef = React.useRef<string[]>([]);
  // Set when an external reset was just adopted but the adopted selection has not
  // rendered yet. The notify pass consumes it to skip pushing the pre-adoption
  // local selection back over the adopted value, and reconciliation defers until
  // the adopted selection settles — reconciling the stale pre-adoption selection
  // would restore its unavailable IDs and the next notify pass would write them
  // back over the adopted value (e.g. undoing the empty selection a Revert
  // requested)
  const pendingAdoptionRef = React.useRef(false);

  // Handle initial selection from route state
  React.useEffect(() => {
    if (
      transformedServers.length === 0 ||
      (hasProcessedInitialSelection.current &&
        (hasReceivedInitialSelection.current ||
          !initialSelectedServerIds ||
          initialSelectedServerIds.length === 0))
    ) {
      return;
    }

    if (initialSelectedServerIds && initialSelectedServerIds.length > 0) {
      hasReceivedInitialSelection.current = true;
      const visibleIds = new Set(transformedServers.map((server) => server.id));
      unavailableSelectedIds.current = new Set(
        initialSelectedServerIds.filter((id) => !visibleIds.has(id)),
      );
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

  // Adopt external selection resets. The parent store echoes this hook's emissions
  // back through initialSelectedServerIds, so a value diverging from the last
  // emission can only be an external change — e.g. reverting a pane restores the
  // baseline MCP servers. Echoes are skipped so they never fight local edits.
  React.useEffect(() => {
    if (!initialSelectedServerIds) {
      return;
    }
    const emittedIds = lastEmittedIdsRef.current;
    const isEcho =
      initialSelectedServerIds.length === emittedIds.length &&
      initialSelectedServerIds.every((id) => emittedIds.includes(id));
    if (isEcho) {
      return;
    }
    const visibleIds = new Set(transformedServers.map((server) => server.id));
    unavailableSelectedIds.current = new Set(
      initialSelectedServerIds.filter((id) => !visibleIds.has(id)),
    );
    setSelectedServers(
      transformedServers.filter((server) => initialSelectedServerIds.includes(server.id)),
    );
    pendingAdoptionRef.current = true;
  }, [initialSelectedServerIds, transformedServers]);

  // A selected server can disappear from the usable list while it is unreachable.
  // Keep its ID until it returns, without displaying a stale row in the picker.
  React.useEffect(() => {
    if (!isInitialLoadComplete) {
      return;
    }
    if (pendingAdoptionRef.current) {
      return;
    }

    const visibleIds = new Set(transformedServers.map((server) => server.id));
    const stillVisible = selectedServers.filter((server) => visibleIds.has(server.id));
    selectedServers
      .filter((server) => !visibleIds.has(server.id))
      .forEach((server) => unavailableSelectedIds.current.add(server.id));

    const restored = transformedServers.filter((server) =>
      unavailableSelectedIds.current.has(server.id),
    );
    const stillVisibleIds = new Set(stillVisible.map((server) => server.id));
    const newlyRestored = restored.filter((server) => !stillVisibleIds.has(server.id));
    if (stillVisible.length !== selectedServers.length || newlyRestored.length > 0) {
      setSelectedServers([...stillVisible, ...newlyRestored]);
    } else {
      restored.forEach((server) => unavailableSelectedIds.current.delete(server.id));
    }
  }, [isInitialLoadComplete, selectedServers, transformedServers]);

  // Notify parent of selection changes
  React.useEffect(() => {
    const selectedConnectionUrls = [
      ...new Set([
        ...selectedServers.map((server) => server.id),
        ...unavailableSelectedIds.current,
      ]),
    ];
    lastEmittedIdsRef.current = selectedConnectionUrls;
    if (pendingAdoptionRef.current) {
      pendingAdoptionRef.current = false;
      return;
    }
    if (isInitialLoadComplete && transformedServers.length > 0) {
      onSelectionChange?.(selectedConnectionUrls);
    }
  }, [isInitialLoadComplete, selectedServers, onSelectionChange, transformedServers]);

  return {
    selectedServers,
    isInitialLoadComplete,
    setSelectedServers,
  };
};

export default useServerSelection;
