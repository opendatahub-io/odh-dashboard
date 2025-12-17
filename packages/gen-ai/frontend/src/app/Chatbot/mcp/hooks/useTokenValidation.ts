import * as React from 'react';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { GenAiAPIs, MCPServer, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';

export interface ValidationResult {
  success: boolean;
  error?: string;
}

export interface UseTokenValidationReturn {
  validateServerToken: (serverUrl: string, token: string) => Promise<ValidationResult>;
  validatingServers: Set<string>;
  validationErrors: Map<string, string>;
  handleLockClick: (server: MCPServer) => Promise<void>;
  checkingServers: Set<string>;
  clearValidationError: (serverUrl: string) => void;
}

export interface UseTokenValidationProps {
  api: GenAiAPIs;
  apiAvailable: boolean;
  transformedServers: MCPServer[];
  checkServerStatus: (serverUrl: string, mcpBearerToken?: string) => Promise<ServerStatusInfo>;
  onTokenUpdate: (serverUrl: string, tokenInfo: TokenInfo) => void;
  getToken: (serverUrl: string) => TokenInfo | undefined;
  onFetchTools: (serverUrl: string, token: string) => Promise<void>;
  onConfigModalOpen: (server: MCPServer) => void;
  onConfigModalClose: () => void;
  onSuccessModalOpen: (server: MCPServer) => void;
}

const MCP_AUTH_EVENT_NAME = 'Playground MCP Auth';

/**
 * Hook for validating MCP server tokens and handling server lock/unlock flow.
 *
 * @param props - Configuration for token validation
 * @returns Object containing validation functions and state
 */
const useTokenValidation = ({
  api,
  apiAvailable,
  transformedServers,
  checkServerStatus,
  onTokenUpdate,
  getToken,
  onFetchTools,
  onConfigModalOpen,
  onConfigModalClose,
  onSuccessModalOpen,
}: UseTokenValidationProps): UseTokenValidationReturn => {
  const [validatingServers, setValidatingServers] = React.useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = React.useState<Map<string, string>>(new Map());
  const [checkingServers, setCheckingServers] = React.useState<Set<string>>(new Set());

  const validateServerToken = React.useCallback(
    async (serverUrl: string, token: string): Promise<ValidationResult> => {
      if (!apiAvailable) {
        return { success: false, error: 'API is not available' };
      }

      setValidatingServers((prev) => new Set(prev).add(serverUrl));
      setValidationErrors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(serverUrl);
        return newMap;
      });

      try {
        const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        const status = await api.getMCPServerStatus(
          {
            // eslint-disable-next-line camelcase
            server_url: serverUrl,
          },
          {
            headers: {
              'X-MCP-Bearer': bearerToken,
            },
          },
        );

        if (status.status === 'connected') {
          onTokenUpdate(serverUrl, {
            token,
            authenticated: true,
            autoConnected: false,
          });

          setValidationErrors((prev) => {
            const updated = new Map(prev);
            updated.delete(serverUrl);
            return updated;
          });

          fireFormTrackingEvent(MCP_AUTH_EVENT_NAME, {
            outcome: TrackingOutcome.submit,
            success: true,
          });

          await onFetchTools(serverUrl, bearerToken);

          const server = transformedServers.find((s) => s.connectionUrl === serverUrl);
          if (server) {
            onConfigModalClose();
            onSuccessModalOpen(server);
          }

          return { success: true };
        }

        onTokenUpdate(serverUrl, {
          token,
          authenticated: false,
          autoConnected: false,
        });

        const errorMsg = status.error_details?.raw_error || status.message || 'Connection failed';
        setValidationErrors((prev) => new Map(prev).set(serverUrl, errorMsg));
        fireFormTrackingEvent(MCP_AUTH_EVENT_NAME, {
          outcome: TrackingOutcome.submit,
          success: false,
          error: errorMsg,
        });
        return { success: false, error: errorMsg };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Validation failed';
        setValidationErrors((prev) => new Map(prev).set(serverUrl, errorMsg));
        fireFormTrackingEvent(MCP_AUTH_EVENT_NAME, {
          outcome: TrackingOutcome.submit,
          success: false,
          error: errorMsg,
        });
        return { success: false, error: errorMsg };
      } finally {
        setValidatingServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serverUrl);
          return newSet;
        });
      }
    },
    [
      api,
      apiAvailable,
      onTokenUpdate,
      onFetchTools,
      transformedServers,
      onConfigModalClose,
      onSuccessModalOpen,
    ],
  );

  const clearValidationError = React.useCallback((serverUrl: string) => {
    setValidationErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(serverUrl);
      return newMap;
    });
  }, []);

  const handleLockClick = React.useCallback(
    async (server: MCPServer) => {
      const tokenInfo = getToken(server.connectionUrl);
      if (tokenInfo?.authenticated || tokenInfo?.autoConnected) {
        onSuccessModalOpen(server);
        return;
      }

      setCheckingServers((prev) => new Set(prev).add(server.connectionUrl));
      fireMiscTrackingEvent('Playground MCP Start Auth', {
        mcpServerName: server.name,
      });

      try {
        const statusInfo = await checkServerStatus(server.connectionUrl);

        if (statusInfo.status === 'connected') {
          onTokenUpdate(server.connectionUrl, {
            token: '',
            authenticated: true,
            autoConnected: true,
          });

          await onFetchTools(server.connectionUrl, '');
          onSuccessModalOpen(server);
        } else {
          onConfigModalOpen(server);
        }
      } catch {
        onConfigModalOpen(server);
      } finally {
        setCheckingServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(server.connectionUrl);
          return newSet;
        });
      }
    },
    [
      checkServerStatus,
      onTokenUpdate,
      onFetchTools,
      getToken,
      onSuccessModalOpen,
      onConfigModalOpen,
    ],
  );

  return {
    validateServerToken,
    validatingServers,
    validationErrors,
    handleLockClick,
    checkingServers,
    clearValidationError,
  };
};

export default useTokenValidation;
