import * as React from 'react';
import { MCPServerUIStatus, MCPConnectionStatus, MCPServerFromAPI } from '~/app/types';
import { processServerStatus, getStatusErrorMessage } from '~/app/utilities/mcp';
import { useGenAiAPI } from './useGenAiAPI';

export type ServerStatusInfo = {
  status: MCPServerUIStatus;
  message: string;
  lastChecked?: number;
  pingMs?: number;
};

/**
 * Hook to manage MCP server connection statuses.
 * Automatically checks all servers when loaded.
 */
const useMCPServerStatuses = (
  servers?: MCPServerFromAPI[],
  loaded?: boolean,
): {
  serverStatuses: Map<string, ServerStatusInfo>;
  statusesLoading: Set<string>;
  checkServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
} => {
  const { api, apiAvailable } = useGenAiAPI();
  const [serverStatuses, setServerStatuses] = React.useState<Map<string, ServerStatusInfo>>(
    new Map(),
  );
  const [statusesLoading, setStatusesLoading] = React.useState<Set<string>>(new Set());

  const checkServerStatus = React.useCallback(
    async (serverUrl: string, mcpBearerToken?: string): Promise<ServerStatusInfo> => {
      if (!apiAvailable) {
        throw new Error('API is not available');
      }

      setStatusesLoading((prev) => new Set(prev).add(serverUrl));

      try {
        const headers: Record<string, string> = {};
        if (mcpBearerToken && mcpBearerToken.trim() !== '') {
          const token = mcpBearerToken.startsWith('Bearer ')
            ? mcpBearerToken
            : `Bearer ${mcpBearerToken}`;
          headers['X-MCP-Bearer'] = token;
        }

        const statusResponse: MCPConnectionStatus = await api.getMCPServerStatus(
          {
            // eslint-disable-next-line camelcase
            server_url: serverUrl,
          },
          { headers },
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
        throw error;
      } finally {
        setStatusesLoading((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serverUrl);
          return newSet;
        });
      }
    },
    [apiAvailable, api],
  );

  React.useEffect(() => {
    if (loaded && servers && servers.length > 0) {
      Promise.allSettled(
        servers.map((server) =>
          checkServerStatus(server.url).catch(() => {
            // Errors are handled in checkServerStatus
          }),
        ),
      );
    }
  }, [loaded, servers, checkServerStatus]);

  return {
    serverStatuses,
    statusesLoading,
    checkServerStatus,
  };
};

export default useMCPServerStatuses;
