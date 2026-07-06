import * as React from 'react';
import { TokenInfo } from '~/app/types';

export interface UseServerTokensReturn {
  serverTokens: Map<string, TokenInfo>;
  updateToken: (serverUrl: string, tokenInfo: TokenInfo) => void;
  removeToken: (serverUrl: string) => void;
  getToken: (serverUrl: string) => TokenInfo | undefined;
}

export interface UseServerTokensProps {
  onServerTokensChange: (tokens: Map<string, TokenInfo>) => void;
  initialTokens?: Map<string, TokenInfo>;
}

/**
 * Hook for managing MCP server authentication tokens.
 * Provides a clean interface for token CRUD operations.
 *
 * @param props - Configuration for token management
 * @returns Object containing token state and management functions
 */
const useServerTokens = ({
  onServerTokensChange,
  initialTokens,
}: UseServerTokensProps): UseServerTokensReturn => {
  const [serverTokens, setServerTokens] = React.useState<Map<string, TokenInfo>>(
    initialTokens || new Map(),
  );

  const updateToken = React.useCallback(
    (serverUrl: string, tokenInfo: TokenInfo) => {
      const updatedTokens = new Map(serverTokens);
      updatedTokens.set(serverUrl, tokenInfo);
      setServerTokens(updatedTokens);
      onServerTokensChange(updatedTokens);
    },
    [serverTokens, onServerTokensChange],
  );

  const removeToken = React.useCallback(
    (serverUrl: string) => {
      const updatedTokens = new Map(serverTokens);
      updatedTokens.delete(serverUrl);
      setServerTokens(updatedTokens);
      onServerTokensChange(updatedTokens);
    },
    [serverTokens, onServerTokensChange],
  );

  const getToken = React.useCallback(
    (serverUrl: string): TokenInfo | undefined => serverTokens.get(serverUrl),
    [serverTokens],
  );

  return {
    serverTokens,
    updateToken,
    removeToken,
    getToken,
  };
};

export default useServerTokens;
