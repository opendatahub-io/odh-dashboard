import * as React from 'react';
import { MCPServerFromAPI, MCPServerUIStatus, MCPConnectionStatus } from '~/app/types';
import { getMCPServers, getMCPServerStatus } from '~/app/services/llamaStackService';
import { processServerStatus, getStatusErrorMessage } from '~/app/utilities/mcp';

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
  options: { autoCheckStatuses?: boolean } = { autoCheckStatuses: true },
): {
  servers: MCPServerFromAPI[];
  serversLoaded: boolean;
  serversLoadError: Error | null;
  serverStatuses: Map<string, ServerStatusInfo>;
  statusesLoading: Set<string>;
  allStatusesChecked: boolean;
  refresh: () => void;
  checkServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
} => {
  const [servers, setServers] = React.useState<MCPServerFromAPI[]>([]);
  const [serversLoaded, setServersLoaded] = React.useState(false);
  const [serversLoadError, setServersLoadError] = React.useState<Error | null>(null);
  const [serverStatuses, setServerStatuses] = React.useState<Map<string, ServerStatusInfo>>(
    new Map(),
  );
  const [statusesLoading, setStatusesLoading] = React.useState<Set<string>>(new Set());
  const [allStatusesChecked, setAllStatusesChecked] = React.useState(false);

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

  const checkServerStatus = React.useCallback(
    async (serverUrl: string, mcpBearerToken?: string): Promise<ServerStatusInfo> => {
      if (!namespace) {
        throw new Error('No namespace provided');
      }

      setStatusesLoading((prev) => new Set(prev).add(serverUrl));

      try {
        const statusResponse: MCPConnectionStatus = await getMCPServerStatus(
          namespace,
          serverUrl,
          mcpBearerToken,
        );

        const statusInfo: ServerStatusInfo = {
          status: processServerStatus(statusResponse),
          message: getStatusErrorMessage(statusResponse),
          lastChecked: statusResponse.last_checked,
          pingMs: statusResponse.ping_response_time_ms,
        };

        setServerStatuses((prev) => new Map(prev).set(serverUrl, statusInfo));
        return statusInfo;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        const errorStatusInfo: ServerStatusInfo = {
          status: 'unreachable',
          message: errorMessage,
          lastChecked: Date.now(),
        };

        setServerStatuses((prev) => new Map(prev).set(serverUrl, errorStatusInfo));
        throw error; // Re-throw for caller to handle
      } finally {
        setStatusesLoading((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serverUrl);
          return newSet;
        });
      }
    },
    [namespace],
  );

  const checkAllStatuses = React.useCallback(async () => {
    if (!options.autoCheckStatuses || servers.length === 0) {
      setAllStatusesChecked(true);
      return;
    }

    setAllStatusesChecked(false);

    const CONCURRENT_LIMIT = 5;
    const chunks = [];

    for (let i = 0; i < servers.length; i += CONCURRENT_LIMIT) {
      chunks.push(servers.slice(i, i + CONCURRENT_LIMIT));
    }

    for (const chunk of chunks) {
      const statusChecks = chunk.map(async (server) => {
        try {
          await checkServerStatus(server.url);
          // Status is already cached by checkServerStatus
        } catch {
          // Error is already cached by checkServerStatus
        }
      });
      await Promise.allSettled(statusChecks);
    }

    setAllStatusesChecked(true);
  }, [servers, checkServerStatus, options.autoCheckStatuses]);

  React.useEffect(() => {
    if (serversLoaded && options.autoCheckStatuses) {
      checkAllStatuses();
    } else if (serversLoaded && !options.autoCheckStatuses) {
      setAllStatusesChecked(true);
      setServerStatuses(new Map());
    }
  }, [serversLoaded, checkAllStatuses, options.autoCheckStatuses]);

  React.useEffect(() => {
    setServerStatuses(new Map());
    setAllStatusesChecked(false);
    fetchServers();
  }, [fetchServers]);

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
    checkServerStatus,
  };
};
