import * as React from 'react';
import { useBrowserStorage } from 'mod-arch-core';
import { MCP_SERVERS_SESSION_STORAGE_KEY } from '~/app/utilities/const';

type MCPSelectionContextValue = {
  playgroundSelectedServerIds: string[];
  selectedServersCount: number;
  saveSelectedServersToPlayground: (serverIds: string[]) => void;
  setSelectedServersCount: (count: number) => void;
};

const MCPSelectionContext = React.createContext<MCPSelectionContextValue | null>(null);

type MCPSelectionContextProviderProps = {
  children: React.ReactNode;
};

export const MCPSelectionContextProvider: React.FunctionComponent<
  MCPSelectionContextProviderProps
> = ({ children }) => {
  const [playgroundSelectedServerIds, setPlaygroundSelectedServerIds] = useBrowserStorage<string[]>(
    MCP_SERVERS_SESSION_STORAGE_KEY,
    [],
    true,
    true,
  );

  const [selectedServersCount, setSelectedServersCount] = React.useState<number>(0);

  const saveSelectedServersToPlayground = React.useCallback(
    (serverIds: string[]) => {
      setPlaygroundSelectedServerIds(serverIds);
    },
    [setPlaygroundSelectedServerIds],
  );

  const contextValue = React.useMemo<MCPSelectionContextValue>(
    () => ({
      playgroundSelectedServerIds,
      selectedServersCount,
      saveSelectedServersToPlayground,
      setSelectedServersCount,
    }),
    [playgroundSelectedServerIds, selectedServersCount, saveSelectedServersToPlayground],
  );

  return (
    <MCPSelectionContext.Provider value={contextValue}>{children}</MCPSelectionContext.Provider>
  );
};

export const useMCPSelectionContext = (): MCPSelectionContextValue => {
  const context = React.useContext(MCPSelectionContext);
  if (!context) {
    throw new Error('useMCPSelectionContext must be used within an MCPSelectionContextProvider');
  }
  return context;
};
