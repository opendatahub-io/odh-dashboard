import * as React from 'react';
import { Namespace } from 'mod-arch-core';
import { MCPSelectionContextProvider } from './MCPSelectionContext';
import { MCPServersContextProvider } from './MCPServersContext';
import { MCPTokenContextProvider } from './MCPTokenContext';

type MCPLazyProviderProps = {
  children: React.ReactNode;
};

/**
 * Lazy MCP Provider that only loads heavy contexts when needed.
 * MCPSelectionContext is always loaded (lightweight).
 * MCPServersContext and MCPTokenContext are loaded on-demand.
 */
export const MCPLazyProvider: React.FC<MCPLazyProviderProps> = ({ children }) => (
  <MCPSelectionContextProvider>{children}</MCPSelectionContextProvider>
);

type MCPFullProviderProps = {
  children: React.ReactNode;
  namespace: Namespace | undefined;
  autoCheckStatuses?: boolean;
};

/**
 * Full MCP Provider that loads all contexts immediately.
 * Use this when you know MCP features will be used.
 * Note: MCPSelectionContext should already be provided by MCPLazyProvider at root level.
 */
export const MCPFullProvider: React.FC<MCPFullProviderProps> = ({
  children,
  namespace,
  autoCheckStatuses = false,
}) => (
  <MCPTokenContextProvider namespace={namespace}>
    <MCPServersContextProvider namespace={namespace} autoCheckStatuses={autoCheckStatuses}>
      {children}
    </MCPServersContextProvider>
  </MCPTokenContextProvider>
);

/**
 * Hook to check if heavy MCP contexts are available
 */
export const useMCPContextsAvailable = (): {
  serversAvailable: boolean;
  tokensAvailable: boolean;
} => {
  const [serversAvailable, setServersAvailable] = React.useState(false);
  const [tokensAvailable, setTokensAvailable] = React.useState(false);

  React.useEffect(() => {
    // Check if contexts are available
    try {
      // Dynamic imports to check availability
      import('./MCPServersContext')
        .then(() => {
          setServersAvailable(true);
        })
        .catch(() => {
          // Context not available
        });

      import('./MCPTokenContext')
        .then(() => {
          setTokensAvailable(true);
        })
        .catch(() => {
          // Context not available
        });
    } catch {
      // Contexts not available
    }
  }, []);

  return { serversAvailable, tokensAvailable };
};
