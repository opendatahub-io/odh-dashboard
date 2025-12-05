import * as React from 'react';
import { GenAiAPIs } from '~/app/types';

export interface UseServerToolsReturn {
  serverToolsCount: Map<string, number>;
  fetchingToolsServers: Set<string>;
  fetchToolsCount: (serverUrl: string, token?: string) => Promise<void>;
}

export interface UseServerToolsProps {
  api: GenAiAPIs;
  apiAvailable: boolean;
}

/**
 * Hook for managing MCP server tools information.
 * Fetches and caches the count of available tools for each server.
 *
 * @param props - API instance and availability status
 * @returns Object containing tools count state and fetch function
 */
const useServerTools = ({ api, apiAvailable }: UseServerToolsProps): UseServerToolsReturn => {
  const [serverToolsCount, setServerToolsCount] = React.useState<Map<string, number>>(new Map());
  const [fetchingToolsServers, setFetchingToolsServers] = React.useState<Set<string>>(new Set());

  const fetchToolsCount = React.useCallback(
    async (serverUrl: string, token?: string) => {
      if (!apiAvailable) {
        return;
      }

      setFetchingToolsServers((prev) => new Set(prev).add(serverUrl));

      try {
        const headers: Record<string, string> = {};
        if (token && token.trim() !== '') {
          const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          headers['X-MCP-Bearer'] = bearerToken;
        }

        const response = await api.getMCPServerTools(
          {
            // eslint-disable-next-line camelcase
            server_url: serverUrl,
          },
          { headers },
        );

        if (response.status === 'success' && response.tools_count !== undefined) {
          setServerToolsCount((prev) => new Map(prev).set(serverUrl, response.tools_count || 0));
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to fetch tools count for ${serverUrl}:`, error);
      } finally {
        setFetchingToolsServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serverUrl);
          return newSet;
        });
      }
    },
    [api, apiAvailable],
  );

  return {
    serverToolsCount,
    fetchingToolsServers,
    fetchToolsCount,
  };
};

export default useServerTools;
