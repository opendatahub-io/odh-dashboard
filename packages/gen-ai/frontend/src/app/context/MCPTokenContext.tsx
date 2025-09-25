import * as React from 'react';
import { Namespace } from 'mod-arch-core';
import { TokenInfo } from '~/app/types';

type MCPTokenContextValue = {
  serverTokens: Map<string, TokenInfo>;
  setServerTokens: React.Dispatch<React.SetStateAction<Map<string, TokenInfo>>>;
  isServerValidated: (serverUrl: string) => boolean;
};

const MCPTokenContext = React.createContext<MCPTokenContextValue | null>(null);

type MCPTokenContextProviderProps = {
  children: React.ReactNode;
  namespace: Namespace | undefined;
};

export const MCPTokenContextProvider: React.FunctionComponent<MCPTokenContextProviderProps> = ({
  children,
  namespace,
}) => {
  const selectedProject = namespace?.name;
  const [serverTokens, setServerTokens] = React.useState<Map<string, TokenInfo>>(new Map());

  // Clear tokens when namespace changes
  React.useEffect(() => {
    setServerTokens(new Map());
  }, [selectedProject]);

  const isServerValidated = React.useCallback(
    (serverUrl: string): boolean => {
      const tokenInfo = serverTokens.get(serverUrl);
      return tokenInfo?.authenticated || tokenInfo?.autoConnected || false;
    },
    [serverTokens],
  );

  const contextValue = React.useMemo<MCPTokenContextValue>(
    () => ({
      serverTokens,
      setServerTokens,
      isServerValidated,
    }),
    [serverTokens, setServerTokens, isServerValidated],
  );

  return <MCPTokenContext.Provider value={contextValue}>{children}</MCPTokenContext.Provider>;
};

export const useMCPTokenContext = (): MCPTokenContextValue => {
  const context = React.useContext(MCPTokenContext);
  if (!context) {
    throw new Error('useMCPTokenContext must be used within an MCPTokenContextProvider');
  }
  return context;
};
