import * as React from 'react';
import { Namespace, useBrowserStorage } from 'mod-arch-core';
import { MCPServerFromAPI, MCPToolsStatus, MCPServerConfig, TokenInfo } from '~/app/types';
import { useMCPServers, ServerStatusInfo } from '~/app/hooks/useMCPServers';
import { getMCPServerTools } from '~/app/services/llamaStackService';
import { MCP_SERVERS_SESSION_STORAGE_KEY } from '~/app/utilities/const';

type MCPContextValue = {
  servers: MCPServerFromAPI[];
  serversLoaded: boolean;
  serversLoadError: Error | null;
  serverStatuses: Map<string, ServerStatusInfo>;
  statusesLoading: Set<string>;
  allStatusesChecked: boolean;
  playgroundSelectedServerIds: string[];
  saveSelectedServersToPlayground: (serverIds: string[]) => void;
  selectedServersCount: number;
  setSelectedServersCount: (count: number) => void;
  refresh: () => void;
  fetchServerTools: (serverUrl: string, mcpBearerToken?: string) => Promise<MCPToolsStatus>;
  serverTokens: Map<string, TokenInfo>;
  setServerTokens: React.Dispatch<React.SetStateAction<Map<string, TokenInfo>>>;
  isServerValidated: (serverUrl: string) => boolean;
  getSelectedServersForAPI: () => MCPServerConfig[];
  checkServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
};

const MCPContext = React.createContext<MCPContextValue | null>(null);

type MCPContextProviderProps = {
  children: React.ReactNode;
  namespace: Namespace | undefined;
};

export const MCPContextProvider: React.FunctionComponent<MCPContextProviderProps> = ({
  children,
  namespace,
}) => {
  const selectedProject = namespace?.name;

  const {
    servers,
    serversLoaded,
    serversLoadError,
    serverStatuses,
    statusesLoading,
    allStatusesChecked,
    refresh,
    checkServerStatus,
  } = useMCPServers(selectedProject || '', { autoCheckStatuses: false });

  const [playgroundSelectedServerIds, setPlaygroundSelectedServerIds] = useBrowserStorage<string[]>(
    MCP_SERVERS_SESSION_STORAGE_KEY,
    [],
    true,
    true,
  );

  const [selectedServersCount, setSelectedServersCount] = React.useState<number>(0);
  const [serverTokens, setServerTokens] = React.useState<Map<string, TokenInfo>>(new Map());

  const saveSelectedServersToPlayground = React.useCallback(
    (serverIds: string[]) => {
      setPlaygroundSelectedServerIds(serverIds);
    },
    [setPlaygroundSelectedServerIds],
  );

  const fetchServerTools = React.useCallback(
    async (serverUrl: string, mcpBearerToken?: string): Promise<MCPToolsStatus> => {
      if (!selectedProject) {
        throw new Error('No namespace selected');
      }

      return getMCPServerTools(selectedProject, serverUrl, mcpBearerToken);
    },
    [selectedProject],
  );

  const isServerValidated = React.useCallback(
    (serverUrl: string): boolean => {
      const tokenInfo = serverTokens.get(serverUrl);
      return tokenInfo?.authenticated || tokenInfo?.autoConnected || false;
    },
    [serverTokens],
  );

  const getSelectedServersForAPI = React.useCallback((): MCPServerConfig[] => {
    const selectedServerUrls = new Set(playgroundSelectedServerIds);
    const validServers: MCPServerConfig[] = [];
    let excludedCount = 0;

    servers.forEach((server) => {
      if (!selectedServerUrls.has(server.url)) {
        return;
      }

      const statusInfo = serverStatuses.get(server.url);
      const tokenInfo = serverTokens.get(server.url);
      const isValidated = isServerValidated(server.url);
      const isConnected = statusInfo?.status === 'connected' || tokenInfo?.authenticated === true;

      if (isConnected && isValidated) {
        const serverTokenInfo = serverTokens.get(server.url);
        const headers: Record<string, string> = {};

        if (serverTokenInfo?.token) {
          headers.Authorization = `Bearer ${serverTokenInfo.token}`;
        }

        validServers.push({
          // eslint-disable-next-line camelcase
          server_label: server.name,
          // eslint-disable-next-line camelcase
          server_url: server.url,
          headers,
        });
      } else {
        excludedCount++;
      }
    });

    if (excludedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `Warning: ${excludedCount} selected MCP server(s) excluded from API call due to authentication/connection issues`,
      );
    }

    return validServers;
  }, [playgroundSelectedServerIds, servers, serverStatuses, isServerValidated, serverTokens]);

  const contextValue = React.useMemo<MCPContextValue>(
    () => ({
      servers,
      serversLoaded,
      serversLoadError,
      serverStatuses,
      statusesLoading,
      allStatusesChecked,
      playgroundSelectedServerIds,
      saveSelectedServersToPlayground,
      selectedServersCount,
      setSelectedServersCount,
      refresh,
      fetchServerTools,
      serverTokens,
      setServerTokens,
      isServerValidated,
      getSelectedServersForAPI,
      checkServerStatus,
    }),
    [
      playgroundSelectedServerIds,
      saveSelectedServersToPlayground,
      selectedServersCount,
      setSelectedServersCount,
      servers,
      serversLoaded,
      serversLoadError,
      serverStatuses,
      statusesLoading,
      allStatusesChecked,
      refresh,
      fetchServerTools,
      serverTokens,
      setServerTokens,
      isServerValidated,
      getSelectedServersForAPI,
      checkServerStatus,
    ],
  );

  return <MCPContext.Provider value={contextValue}>{children}</MCPContext.Provider>;
};

export const useMCPContext = (): MCPContextValue => {
  const context = React.useContext(MCPContext);
  if (!context) {
    throw new Error('useMCPContext must be used within an MCPContextProvider');
  }
  return context;
};
