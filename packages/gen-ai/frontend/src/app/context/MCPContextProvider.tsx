import * as React from 'react';
import { Namespace } from 'mod-arch-core';
import { MCPSelectionContextProvider } from './MCPSelectionContext';
import { MCPServersContextProvider } from './MCPServersContext';
import { MCPTokenContextProvider } from './MCPTokenContext';

type MCPSelectionProviderProps = {
  children: React.ReactNode;
};

/**
 * Basic MCP Provider that only provides selection state management.
 * Lightweight context for tracking which MCP servers are selected.
 * Use this at the root level for basic MCP functionality.
 */
export const MCPSelectionProvider: React.FC<MCPSelectionProviderProps> = ({ children }) => (
  <MCPSelectionContextProvider>{children}</MCPSelectionContextProvider>
);

type MCPDataProviderProps = {
  children: React.ReactNode;
  namespace: Namespace | undefined;
  autoCheckStatuses?: boolean;
};

/**
 * Complete MCP Provider that includes server data fetching and token management.
 * Provides all MCP contexts including server status checking and authentication.
 * Use this when you need full MCP functionality (server lists, status checks, tools).
 * Note: MCPSelectionContext should already be provided by MCPSelectionProvider at root level.
 */
export const MCPDataProvider: React.FC<MCPDataProviderProps> = ({
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
