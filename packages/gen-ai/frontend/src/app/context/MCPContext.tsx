import * as React from 'react';
import { useBrowserStorage } from 'mod-arch-core';
import { MCPServerFromAPI, MCPToolsStatus } from '~/app/types';
import { useProject } from '~/app/context/ProjectContext';
import { useMCPServers, ServerStatusInfo } from '~/app/hooks/useMCPServers';
import { getMCPServerTools } from '~/app/services/llamaStackService';

type MCPContextValue = {
  // Data from hooks (read-only)
  servers: MCPServerFromAPI[];
  serversLoaded: boolean;
  serversLoadError: Error | null;
  serverStatuses: Map<string, ServerStatusInfo>;
  statusesLoading: Set<string>;
  allStatusesChecked: boolean;

  // Playground-bound server selections (persistent across navigation)
  playgroundSelectedServerIds: string[];
  saveSelectedServersToPlayground: (serverIds: string[]) => void;

  // Current panel selections (for UI display)
  selectedServersCount: number;
  setSelectedServersCount: (count: number) => void;

  // Refresh actions (delegate to hooks)
  refresh: () => void;

  // Tools fetching (context-managed for cross-component use)
  fetchServerTools: (serverUrl: string, mcpBearerToken?: string) => Promise<MCPToolsStatus>;

  // Current namespace tracking
  currentNamespace: string | null;
};

const MCPContext = React.createContext<MCPContextValue | null>(null);

type MCPContextProviderProps = {
  children: React.ReactNode;
};

export const MCPContextProvider: React.FunctionComponent<MCPContextProviderProps> = ({
  children,
}) => {
  const { selectedProject } = useProject();

  // Use existing hook for data fetching
  const {
    servers,
    serversLoaded,
    serversLoadError,
    serverStatuses,
    statusesLoading,
    allStatusesChecked,
    refresh,
  } = useMCPServers(selectedProject || '');

  // Playground-bound server selections with sessionStorage persistence
  const [playgroundSelectedServerIds, setPlaygroundSelectedServerIds] = useBrowserStorage<string[]>(
    `gen-ai-playground-servers-${selectedProject || 'default'}`,
    [], // default value
    true, // jsonify
    true, // use sessionStorage (not localStorage)
  );

  // Current namespace tracking
  const [currentNamespace, setCurrentNamespace] = React.useState<string | null>(null);

  // Current panel selections count (for UI display)
  const [selectedServersCount, setSelectedServersCount] = React.useState<number>(0);

  // Update current namespace when project changes
  React.useEffect(() => {
    if (selectedProject !== currentNamespace) {
      setCurrentNamespace(selectedProject);
    }
  }, [selectedProject, currentNamespace]);

  // Function to save selected servers to playground (called by "Try in Playground" button)
  const saveSelectedServersToPlayground = React.useCallback(
    (serverIds: string[]) => {
      setPlaygroundSelectedServerIds(serverIds);
    },
    [setPlaygroundSelectedServerIds],
  );

  // Tools fetching function (context-managed for reuse)
  const fetchServerTools = React.useCallback(
    async (serverUrl: string, mcpBearerToken?: string): Promise<MCPToolsStatus> => {
      if (!selectedProject) {
        throw new Error('No namespace selected');
      }

      return getMCPServerTools(selectedProject, serverUrl, mcpBearerToken);
    },
    [selectedProject],
  );

  const contextValue = React.useMemo<MCPContextValue>(
    () => ({
      // Data from hooks
      servers,
      serversLoaded,
      serversLoadError,
      serverStatuses,
      statusesLoading,
      allStatusesChecked,

      // Playground-bound server selections (persistent across navigation)
      playgroundSelectedServerIds,
      saveSelectedServersToPlayground,

      // Current panel selections (for UI display)
      selectedServersCount,
      setSelectedServersCount,

      // Refresh actions
      refresh,

      // Tools fetching
      fetchServerTools,

      // Namespace tracking
      currentNamespace,
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
      currentNamespace,
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
