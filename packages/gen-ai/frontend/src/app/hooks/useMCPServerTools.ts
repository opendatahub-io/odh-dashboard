import * as React from 'react';
import { getMCPServerTools } from '~/app/services/llamaStackService';
import { MCPToolsStatus, MCPToolFromAPI } from '~/app/types';

export type UseMCPServerToolsReturn = {
  tools: MCPToolFromAPI[];
  toolsLoaded: boolean;
  toolsLoadError: Error | null;
  toolsStatus: MCPToolsStatus | null;
  isLoading: boolean;
  refetch: () => void;
};

export const useMCPServerTools = (
  namespace: string,
  serverUrl: string,
  mcpBearerToken?: string,
  enabled = true,
): UseMCPServerToolsReturn => {
  const [tools, setTools] = React.useState<MCPToolFromAPI[]>([]);
  const [toolsLoaded, setToolsLoaded] = React.useState(false);
  const [toolsLoadError, setToolsLoadError] = React.useState<Error | null>(null);
  const [toolsStatus, setToolsStatus] = React.useState<MCPToolsStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchTools = React.useCallback(async () => {
    if (!namespace || !serverUrl || !enabled) {
      setTools([]);
      setToolsLoaded(true);
      setToolsLoadError(null);
      setToolsStatus(null);
      return;
    }

    setIsLoading(true);
    setToolsLoadError(null);

    try {
      const response = await getMCPServerTools(namespace, serverUrl, mcpBearerToken);

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
  }, [namespace, serverUrl, mcpBearerToken, enabled]);

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
