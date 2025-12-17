import * as React from 'react';
import { MCPServer, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';

export interface UseAutoUnlockReturn {
  handleAutoUnlock: (server: MCPServer) => Promise<void>;
  autoUnlockingServers: Set<string>;
}

export interface UseAutoUnlockProps {
  checkServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
  selectedServers: MCPServer[];
  isInitialLoadComplete: boolean;
  initialServerStatuses?: Map<string, ServerStatusInfo>;
  getToken: (serverUrl: string) => TokenInfo | undefined;
  onTokenUpdate: (serverUrl: string, tokenInfo: TokenInfo) => void;
  onFetchTools: (serverUrl: string, token: string) => Promise<void>;
}

/**
 * Hook for auto-unlocking MCP servers that don't require authentication tokens.
 * Automatically tries to connect to servers when they are selected from route state.
 *
 * @param props - Configuration for auto-unlock behavior
 * @returns Object containing auto-unlock function and state
 */
const useAutoUnlock = ({
  checkServerStatus,
  selectedServers,
  isInitialLoadComplete,
  initialServerStatuses,
  getToken,
  onTokenUpdate,
  onFetchTools,
}: UseAutoUnlockProps): UseAutoUnlockReturn => {
  const [autoUnlockingServers, setAutoUnlockingServers] = React.useState<Set<string>>(new Set());
  const hasProcessedAutoUnlock = React.useRef(false);

  const handleAutoUnlock = React.useCallback(
    async (server: MCPServer) => {
      setAutoUnlockingServers((prev) => new Set(prev).add(server.connectionUrl));

      try {
        const statusInfo = await checkServerStatus(server.connectionUrl);

        if (statusInfo.status === 'connected') {
          onTokenUpdate(server.connectionUrl, {
            token: '',
            authenticated: true,
            autoConnected: true,
          });

          await onFetchTools(server.connectionUrl, '');
        }
      } catch {
        // Silently fail
      } finally {
        setAutoUnlockingServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(server.connectionUrl);
          return newSet;
        });
      }
    },
    [checkServerStatus, onTokenUpdate, onFetchTools],
  );

  // Auto-unlock servers when coming from route state
  React.useEffect(() => {
    if (
      !isInitialLoadComplete ||
      hasProcessedAutoUnlock.current ||
      !initialServerStatuses ||
      initialServerStatuses.size === 0 ||
      selectedServers.length === 0
    ) {
      return;
    }

    const serversToAutoUnlock = selectedServers.filter((server) => {
      const statusInfo = initialServerStatuses.get(server.connectionUrl);
      const tokenInfo = getToken(server.connectionUrl);

      return (
        statusInfo?.status === 'connected' &&
        !tokenInfo?.authenticated &&
        !autoUnlockingServers.has(server.connectionUrl)
      );
    });

    if (serversToAutoUnlock.length > 0) {
      serversToAutoUnlock.forEach((server) => {
        handleAutoUnlock(server);
      });
      hasProcessedAutoUnlock.current = true;
    }
  }, [
    isInitialLoadComplete,
    initialServerStatuses,
    selectedServers,
    getToken,
    autoUnlockingServers,
    handleAutoUnlock,
  ]);

  return {
    handleAutoUnlock,
    autoUnlockingServers,
  };
};

export default useAutoUnlock;
