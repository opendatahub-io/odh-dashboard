import * as React from 'react';
import { Namespace } from 'mod-arch-core';
import { MCPServerFromAPI, MCPServerConfig, TokenInfo } from '~/app/types';
import { useMCPServers, ServerStatusInfo } from '~/app/hooks/useMCPServers';
import { getSelectedServersForAPI as getSelectedServersForAPIUtil } from '~/app/utilities/mcp';

type MCPServersContextValue = {
  servers: MCPServerFromAPI[];
  serversLoaded: boolean;
  serversLoadError: Error | null;
  serverStatuses: Map<string, ServerStatusInfo>;
  statusesLoading: Set<string>;
  allStatusesChecked: boolean;
  refresh: () => void;
  checkServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
  getSelectedServersForAPI: (
    selectedServerIds: string[],
    serverTokens: Map<string, TokenInfo>,
  ) => MCPServerConfig[];
};

const MCPServersContext = React.createContext<MCPServersContextValue | null>(null);

type MCPServersContextProviderProps = {
  children: React.ReactNode;
  namespace: Namespace | undefined;
  autoCheckStatuses?: boolean;
};

export const MCPServersContextProvider: React.FunctionComponent<MCPServersContextProviderProps> = ({
  children,
  namespace,
  autoCheckStatuses = false,
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
  } = useMCPServers(selectedProject || '', { autoCheckStatuses });

  const getSelectedServersForAPI = React.useCallback(
    (selectedServerIds: string[], serverTokens: Map<string, TokenInfo>): MCPServerConfig[] =>
      getSelectedServersForAPIUtil(selectedServerIds, servers, serverStatuses, serverTokens),
    [servers, serverStatuses],
  );

  const contextValue = React.useMemo<MCPServersContextValue>(
    () => ({
      servers,
      serversLoaded,
      serversLoadError,
      serverStatuses,
      statusesLoading,
      allStatusesChecked,
      refresh,
      checkServerStatus,
      getSelectedServersForAPI,
    }),
    [
      servers,
      serversLoaded,
      serversLoadError,
      serverStatuses,
      statusesLoading,
      allStatusesChecked,
      refresh,
      checkServerStatus,
      getSelectedServersForAPI,
    ],
  );

  return <MCPServersContext.Provider value={contextValue}>{children}</MCPServersContext.Provider>;
};

export const useMCPServersContext = (): MCPServersContextValue => {
  const context = React.useContext(MCPServersContext);
  if (!context) {
    throw new Error('useMCPServersContext must be used within an MCPServersContextProvider');
  }
  return context;
};
