/**
 * MCP (Model Context Protocol) Server API Types
 * These types correspond to the responses from the BFF API endpoints for MCP server management
 */

/**
 * MCP Server summary information as returned by the API
 * Corresponds to MCPServerSummary from the BFF
 */
export type MCPServerFromAPI = {
  /** Server name from ConfigMap key */
  name: string;
  /** Full server URL with endpoint path */
  url: string;
  /** Transport protocol type */
  transport: 'sse' | 'streamable-http';
  /** Optional description of server functionality */
  description: string;
  /** Optional logo URL for the server */
  logo: string | null;
  /** Server status from ConfigMap validation */
  status: 'healthy' | 'error' | 'unknown';
};

/**
 * ConfigMap metadata information
 * Provides context about the source ConfigMap for the MCP servers
 */
export type MCPConfigMapInfo = {
  /** Name of the ConfigMap */
  name: string;
  /** Namespace where the ConfigMap is located */
  namespace: string;
  /** ISO 8601 timestamp of last ConfigMap update */
  last_updated: string;
};

/**
 * Complete response from the MCP servers list API
 * Corresponds to MCPListData from the BFF
 */
export type MCPServersResponse = {
  /** Array of MCP server configurations */
  servers: MCPServerFromAPI[];
  /** Total number of servers */
  total_count: number;
  /** Metadata about the source ConfigMap */
  config_map_info: MCPConfigMapInfo;
};

/**
 * Error response structure for MCP API endpoints
 * Used for 404, 403, and other error cases
 */
export type MCPErrorResponse = {
  error: {
    /** HTTP status code as string */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional error details */
    details?: {
      config_map_name?: string;
      namespace?: string;
      reason?: string;
    };
  };
};

/**
 * Transport type enum for type safety
 */
export enum MCPTransportType {
  SSE = 'sse',
  STREAMABLE_HTTP = 'streamable-http',
}

/**
 * Server status enum for type safety
 */
export enum MCPServerStatus {
  HEALTHY = 'healthy',
  ERROR = 'error',
  UNKNOWN = 'unknown',
}

// MCP Server Connection Status Types (from BFF API)
export type MCPServerInfo = {
  name: string;
  version: string;
  protocol_version: string;
};

export type MCPErrorDetails = {
  code: string;
  status_code: number;
  raw_error: string;
};

export type MCPConnectionStatus = {
  server_url: string;
  status: 'connected' | 'error';
  message: string;
  last_checked: number;
  server_info: MCPServerInfo;
  ping_response_time_ms?: number;
  error_details?: MCPErrorDetails;
};

// UI Status Types
export type MCPServerUIStatus =
  | 'connected' // Green check - server responding
  | 'auth_required' // Yellow triangle - 400/401/403 errors (auth/config issues)
  | 'unreachable' // Red cross - 404, 5xx, timeouts
  | 'checking' // Loading state
  | 'unknown'; // Default/error state

// Token Management Types
export type TokenInfo = {
  token: string;
  authenticated: boolean;
  autoConnected: boolean; // Server doesn't require authentication
};

// MCP Tools API Types
export type MCPToolFromAPI = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type MCPToolsStatus = {
  server_url: string;
  status: 'success' | 'error';
  message: string;
  last_checked: number;
  server_info: MCPServerInfo;
  tools_count?: number;
  tools: MCPToolFromAPI[];
  error_details?: MCPErrorDetails;
};

export type MCPToolsResponse = {
  data: MCPToolsStatus;
};

// UI-focused types for components
/**
 * UI representation of an MCP tool with additional display properties
 */
export interface MCPTool {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  enabled: boolean;
}

/**
 * UI representation of an MCP server with additional display properties
 * This is a simplified version for UI components, complementing MCPServerFromAPI
 */
export interface MCPServer {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  endpoint: string;
  connectionUrl: string;
  tools: number;
  toolsList?: MCPTool[];
  version: string;
}
