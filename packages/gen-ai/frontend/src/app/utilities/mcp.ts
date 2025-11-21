import {
  MCPConnectionStatus,
  MCPServer,
  MCPServerFromAPI,
  MCPServerUIStatus,
  MCPServerConfig,
  OutputItem,
  MCPToolCallData,
} from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import { generateMCPServerConfig } from './utils';

/**
 * Transform MCP server data from API to table format
 * @param apiServer - Server data from the MCP API
 * @returns Transformed server data for table display
 */
export const transformMCPServerData = (apiServer: MCPServerFromAPI): MCPServer => ({
  id: apiServer.url, // Use URL as unique identifier
  name: apiServer.name,
  description: apiServer.description,
  status: 'active', // Will be updated with real status
  endpoint: 'View', // Simple endpoint display text
  connectionUrl: apiServer.url, // Full URL for popover
  tools: 0, // Not used in table, keeping for type compatibility
  version: 'Unknown', // Not used in table, keeping for type compatibility
});

/**
 * Get user-friendly error message from MCP connection status
 * @param statusResponse - The status response from getMCPServerStatus API
 * @returns string - User-friendly error message for tooltip
 */
export const getStatusErrorMessage = (statusResponse: MCPConnectionStatus): string => {
  if (statusResponse.status === 'connected') {
    const pingTime = statusResponse.ping_response_time_ms;
    return pingTime ? `Connected (${pingTime}ms)` : 'Connected';
  }

  if (statusResponse.error_details) {
    const { code, status_code: statusCode } = statusResponse.error_details;

    if (statusCode === 400 || code === 'bad_request') {
      return 'Invalid request - check server configuration';
    }

    if (statusCode === 401 || code === 'unauthorized') {
      return 'Authentication token required';
    }

    if (statusCode === 403) {
      return 'Access denied - insufficient permissions';
    }

    if (statusCode === 404) {
      return 'Endpoint not found';
    }

    if (code === 'timeout') {
      return 'Connection timeout';
    }

    if (code === 'connection_error' || code === 'CONNECTION_FAILED') {
      return 'Server unreachable';
    }

    // Use the message from the API if available
    return statusResponse.message || 'Server error';
  }

  return 'Status unknown';
};

/**
 * Process MCP connection status from API and determine UI status
 * @param statusResponse - The status response from getMCPServerStatus API
 * @returns MCPServerUIStatus - The appropriate UI status
 */
export const processServerStatus = (statusResponse: MCPConnectionStatus): MCPServerUIStatus => {
  // If connected, show green check
  if (statusResponse.status === 'connected') {
    return 'connected';
  }

  // If error, check the error details
  if (statusResponse.error_details) {
    const { code, status_code: statusCode } = statusResponse.error_details;

    // Yellow triangle for auth errors and bad requests (400/401/403)
    if (
      statusCode === 400 ||
      statusCode === 401 ||
      statusCode === 403 ||
      code === 'unauthorized' ||
      code === 'bad_request'
    ) {
      return 'auth_required';
    }

    // Red cross for unreachable (404, 5xx, timeouts, connection errors)
    if (
      statusCode === 404 ||
      (statusCode >= 500 && statusCode < 600) ||
      code === 'connection_error' ||
      code === 'CONNECTION_FAILED' ||
      code === 'timeout'
    ) {
      return 'unreachable';
    }

    // Other errors default to unreachable
    return 'unreachable';
  }

  // Default to unknown if we can't determine status
  return 'unknown';
};

/**
 * Extracts MCP tool call data from backend output for tool response display
 * @param output - Array of output items from backend response
 * @returns Tool call data object | undefined - Raw data if MCP call exists without errors
 */
export const extractMCPToolCallData = (output?: OutputItem[]): MCPToolCallData | undefined => {
  if (!output) {
    return undefined;
  }

  // Find the first successful MCP tool call (no error key)
  const successfulMcpCall = output.find((item) => item.type === 'mcp_call' && !('error' in item));

  if (!successfulMcpCall) {
    return undefined;
  }

  // Extract server label and tool name from the successful call
  const serverLabel = 'server_label' in successfulMcpCall ? successfulMcpCall.server_label : null;
  const toolName = 'name' in successfulMcpCall ? successfulMcpCall.name : null;

  if (
    !serverLabel ||
    !toolName ||
    typeof serverLabel !== 'string' ||
    typeof toolName !== 'string'
  ) {
    return undefined;
  }

  // Extract tool arguments and output for display
  const toolArguments = 'arguments' in successfulMcpCall ? successfulMcpCall.arguments : null;
  const toolOutput = 'output' in successfulMcpCall ? successfulMcpCall.output : null;

  return {
    serverLabel,
    toolName,
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    toolArguments: toolArguments ? String(toolArguments) : undefined,
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    toolOutput: toolOutput ? String(toolOutput) : undefined,
  };
};

/**
 * Determines if the auto-unlock flow should be triggered for an MCP server selection
 * This function encapsulates the business logic for when to automatically unlock a server
 * when a user checks its checkbox in the MCP servers panel.
 *
 * @param params - Object containing all conditions for auto-unlock decision
 * @param params.isInitialLoadComplete - Whether initial load from route state is complete
 * @param params.wasSelected - Whether the server was already selected before this action
 * @param params.isAuthenticated - Whether the server is already authenticated
 * @param params.isChecking - Whether the server is currently being checked
 * @param params.isValidating - Whether the server is currently being validated
 * @returns boolean - True if auto-unlock should be triggered, false otherwise
 */
export const shouldTriggerAutoUnlock = (params: {
  isInitialLoadComplete: boolean;
  wasSelected: boolean;
  isAuthenticated: boolean;
  isChecking: boolean;
  isValidating: boolean;
}): boolean => {
  const { isInitialLoadComplete, wasSelected, isAuthenticated, isChecking, isValidating } = params;

  // User is selecting (checking the box, not unchecking)
  const isSelecting = !wasSelected;

  // All conditions must be met for auto-unlock to trigger
  return (
    isInitialLoadComplete && // Initial load from route state is complete
    isSelecting && // User is selecting (not deselecting)
    !isAuthenticated && // Server is not already authenticated
    !isChecking && // Server is not already being checked
    !isValidating // Server is not being validated
  );
};

/**
 * Converts selected MCP servers to API-ready format with authentication headers
 *
 * @param selectedServerIds - Array of server URLs that are selected
 * @param servers - Available MCP servers from API
 * @param serverStatuses - Map of server connection statuses
 * @param serverTokens - Map of server authentication tokens
 * @returns Array of MCP server configurations ready for API calls
 */
export const getSelectedServersForAPI = (
  selectedServerIds: string[],
  servers: MCPServerFromAPI[],
  serverStatuses: Map<string, ServerStatusInfo>,
  serverTokens: Map<string, { token: string; authenticated: boolean; autoConnected: boolean }>,
): MCPServerConfig[] => {
  const validServers: MCPServerConfig[] = [];
  let excludedCount = 0;

  servers.forEach((server) => {
    if (!selectedServerIds.includes(server.url)) {
      return;
    }

    const statusInfo = serverStatuses.get(server.url);
    const tokenInfo = serverTokens.get(server.url);
    const isValidated = tokenInfo?.authenticated || tokenInfo?.autoConnected;
    const isConnected = statusInfo?.status === 'connected' || tokenInfo?.authenticated;

    if (isConnected && isValidated) {
      validServers.push(generateMCPServerConfig(server, serverTokens));
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
};
