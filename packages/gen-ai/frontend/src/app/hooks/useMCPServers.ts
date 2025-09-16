import * as React from 'react';
import { MCPServerFromAPI, MCPServerUIStatus, MCPConnectionStatus } from '~/app/types';
import { getMCPServers, getMCPServerStatus } from '~/app/services/llamaStackService';
import { processServerStatus, getStatusErrorMessage } from '~/app/utilities/mcp';

// Type for server status tracking
export type ServerStatusInfo = {
  status: MCPServerUIStatus;
  message: string;
  lastChecked?: number;
  pingMs?: number;
};

/**
 * Hook to fetch MCP servers and their connection statuses
 * @param namespace - The namespace to fetch MCP servers from
 * @returns Object containing servers, statuses, loading states, and error state
 */
export const useMCPServers = (
  namespace: string,
): {
  servers: MCPServerFromAPI[];
  serversLoaded: boolean;
  serversLoadError: Error | null;
  serverStatuses: Map<string, ServerStatusInfo>;
  statusesLoading: Set<string>;
  allStatusesChecked: boolean;
  refresh: () => void;
} => {
  // Core server data state
  const [servers, setServers] = React.useState<MCPServerFromAPI[]>([]);
  const [serversLoaded, setServersLoaded] = React.useState(false);
  const [serversLoadError, setServersLoadError] = React.useState<Error | null>(null);

  // Server status tracking state
  const [serverStatuses, setServerStatuses] = React.useState<Map<string, ServerStatusInfo>>(
    new Map(),
  );
  const [statusesLoading, setStatusesLoading] = React.useState<Set<string>>(new Set());
  const [allStatusesChecked, setAllStatusesChecked] = React.useState(false);

  // Fetch servers from the API
  const fetchServers = React.useCallback(async () => {
    if (!namespace) {
      setServers([]);
      setServersLoaded(true);
      setServersLoadError(null);
      return;
    }

    setServersLoaded(false);
    setServersLoadError(null);

    try {
      const response = await getMCPServers(namespace);
      setServers(response.servers);
      setServersLoadError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch MCP servers';
      setServersLoadError(new Error(errorMessage));
      setServers([]);
    } finally {
      setServersLoaded(true);
    }
  }, [namespace]);

  // Check status for a single server
  const checkServerStatus = React.useCallback(
    async (server: MCPServerFromAPI) => {
      const serverUrl = server.url;

      // Add to loading set
      setStatusesLoading((prev) => new Set(prev).add(serverUrl));

      try {
        const statusResponse: MCPConnectionStatus = await getMCPServerStatus(namespace, serverUrl);

        const statusInfo: ServerStatusInfo = {
          status: processServerStatus(statusResponse),
          message: getStatusErrorMessage(statusResponse),
          lastChecked: statusResponse.last_checked,
          pingMs: statusResponse.ping_response_time_ms,
        };

        setServerStatuses((prev) => new Map(prev).set(serverUrl, statusInfo));
      } catch (error) {
        // Handle errors by creating an error status
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        const errorStatusInfo: ServerStatusInfo = {
          status: 'unreachable',
          message: errorMessage,
          lastChecked: Date.now(),
        };

        setServerStatuses((prev) => new Map(prev).set(serverUrl, errorStatusInfo));
      } finally {
        // Remove from loading set
        setStatusesLoading((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serverUrl);
          return newSet;
        });
      }
    },
    [namespace],
  );

  // Check statuses for all servers
  const checkAllStatuses = React.useCallback(async () => {
    if (servers.length === 0) {
      setAllStatusesChecked(true);
      return;
    }

    setAllStatusesChecked(false);

    // Use Promise.allSettled to check all servers concurrently
    // but limit concurrency to avoid overwhelming the server
    const CONCURRENT_LIMIT = 5;
    const chunks = [];

    for (let i = 0; i < servers.length; i += CONCURRENT_LIMIT) {
      chunks.push(servers.slice(i, i + CONCURRENT_LIMIT));
    }

    for (const chunk of chunks) {
      await Promise.allSettled(chunk.map(checkServerStatus));
    }

    setAllStatusesChecked(true);
  }, [servers, checkServerStatus]);

  // Auto-check statuses when servers are loaded
  React.useEffect(() => {
    if (serversLoaded && servers.length > 0) {
      checkAllStatuses();
    } else if (serversLoaded && servers.length === 0) {
      setAllStatusesChecked(true);
      setServerStatuses(new Map());
    }
  }, [serversLoaded, servers.length, checkAllStatuses]);

  // Fetch servers when namespace changes
  React.useEffect(() => {
    setServerStatuses(new Map());
    setAllStatusesChecked(false);
    fetchServers();
  }, [fetchServers]);

  // Refresh function
  const refresh = React.useCallback(() => {
    setServerStatuses(new Map());
    setAllStatusesChecked(false);
    fetchServers();
  }, [fetchServers]);

  return {
    servers,
    serversLoaded,
    serversLoadError,
    serverStatuses,
    statusesLoading,
    allStatusesChecked,
    refresh,
  };
};
