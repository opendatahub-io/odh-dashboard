import * as React from 'react';
import { MCPToolsStatus, MCPToolFromAPI } from '~/app/types';
import { useGenAiAPI } from './useGenAiAPI';

export type UseMCPServerToolsReturn = {
  tools: MCPToolFromAPI[];
  toolsLoaded: boolean;
  toolsLoadError: Error | null;
  toolsStatus: MCPToolsStatus | null;
  isLoading: boolean;
  refetch: () => void;
};

export const useMCPServerTools = (
  serverUrl: string,
  mcpBearerToken?: string,
  enabled = true,
): UseMCPServerToolsReturn => {
  const [tools, setTools] = React.useState<MCPToolFromAPI[]>([]);
  const [toolsLoaded, setToolsLoaded] = React.useState(false);
  const [toolsLoadError, setToolsLoadError] = React.useState<Error | null>(null);
  const [toolsStatus, setToolsStatus] = React.useState<MCPToolsStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { api, apiAvailable } = useGenAiAPI();

  const fetchTools = React.useCallback(async () => {
    if (!serverUrl || !enabled || !apiAvailable) {
      setTools([]);
      setToolsLoaded(true);
      setToolsLoadError(null);
      setToolsStatus(null);
      return;
    }

    setIsLoading(true);
    setToolsLoadError(null);

    try {
      const headers: Record<string, string> = {};
      if (mcpBearerToken && mcpBearerToken.trim() !== '') {
        const token = mcpBearerToken.startsWith('Bearer ')
          ? mcpBearerToken
          : `Bearer ${mcpBearerToken}`;
        headers['X-MCP-Bearer'] = token;
      }
      /* eslint-disable camelcase */
      const response = await api
        .getMCPServerTools(
          {
            server_url: serverUrl,
          },
          { headers },
        )
        .catch((error) => {
          const errorResponse: MCPToolsStatus = {
            server_url: serverUrl,
            status: 'error',
            message: 'Connection failed',
            last_checked: Date.now(),
            server_info: {
              name: 'unknown',
              version: 'N/A',
              protocol_version: '',
            },
            tools: [],
            error_details: {
              code: 'CONNECTION_FAILED',
              status_code: 503,
              raw_error: error instanceof Error ? error.message : 'Unknown connection error',
            },
          };

          return errorResponse;
        });
      /* eslint-enable camelcase */

      setToolsStatus(response);

      if (response.status === 'success') {
        setTools(response.tools);
        setToolsLoadError(null);
      } else {
        const errorMessage =
          response.error_details?.raw_error || response.message || 'Failed to fetch tools';
        setToolsLoadError(new Error(errorMessage));
        setTools([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setToolsLoadError(new Error(errorMessage));
      setTools([]);
      setToolsStatus(null);
    } finally {
      setToolsLoaded(true);
      setIsLoading(false);
    }
  }, [serverUrl, enabled, mcpBearerToken, apiAvailable, api]);

  const refetch = React.useCallback(() => {
    setToolsLoaded(false);
    fetchTools();
  }, [fetchTools]);

  React.useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  return {
    tools,
    toolsLoaded,
    toolsLoadError,
    toolsStatus,
    isLoading,
    refetch,
  };
};
