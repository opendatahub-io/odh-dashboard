/* eslint-disable camelcase */

import { MCPConnectionStatus, MCPServerFromAPI } from '~/app/types';
import {
  transformMCPServerData,
  getStatusErrorMessage,
  processServerStatus,
  getSelectedServersForAPI,
} from '~/app/utilities/mcp';

describe('MCP Utilities', () => {
  describe('transformMCPServerData', () => {
    it('transforms API server data to table format correctly', () => {
      const apiServer: MCPServerFromAPI = {
        name: 'test-server',
        url: 'https://example.com/mcp',
        transport: 'sse',
        description: 'A test MCP server',
        logo: 'https://example.com/logo.png',
        status: 'healthy',
      };

      const result = transformMCPServerData(apiServer);

      expect(result).toEqual({
        id: 'https://example.com/mcp',
        name: 'test-server',
        description: 'A test MCP server',
        status: 'active',
        endpoint: 'View',
        connectionUrl: 'https://example.com/mcp',
        tools: 0,
        version: 'Unknown',
      });
    });

    it('handles server with null logo', () => {
      const apiServer: MCPServerFromAPI = {
        name: 'no-logo-server',
        url: 'https://example.com/no-logo',
        transport: 'streamable-http',
        description: 'Server without logo',
        logo: null,
        status: 'error',
      };

      const result = transformMCPServerData(apiServer);

      expect(result.id).toBe('https://example.com/no-logo');
      expect(result.name).toBe('no-logo-server');
      expect(result.status).toBe('active'); // Always set to active in transform
    });

    it('uses URL as unique identifier', () => {
      const apiServer: MCPServerFromAPI = {
        name: 'duplicate-name',
        url: 'https://unique-url.com/mcp',
        transport: 'sse',
        description: 'Test description',
        logo: null,
        status: 'healthy',
      };

      const result = transformMCPServerData(apiServer);
      expect(result.id).toBe(apiServer.url);
    });
  });

  describe('getStatusErrorMessage', () => {
    it('returns connected message with ping time', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'connected',
        message: 'OK',
        last_checked: Date.now(),
        server_info: {
          name: 'test-server',
          version: '1.0.0',
          protocol_version: '2024-11-05',
        },
        ping_response_time_ms: 150,
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Connected (150ms)');
    });

    it('returns connected message without ping time', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'connected',
        message: 'OK',
        last_checked: Date.now(),
        server_info: {
          name: 'test-server',
          version: '1.0.0',
          protocol_version: '2024-11-05',
        },
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Connected');
    });

    it('returns bad request message for 400 status code', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Bad request',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: {
          code: 'bad_request',
          status_code: 400,
          raw_error: 'Invalid request format',
        },
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Invalid request - check server configuration');
    });

    it('returns auth required message for 401 status code', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Unauthorized',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: {
          code: 'unauthorized',
          status_code: 401,
          raw_error: 'Token required',
        },
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Authentication token required');
    });

    it('returns access denied message for 403 status code', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Forbidden',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: {
          code: 'forbidden',
          status_code: 403,
          raw_error: 'Insufficient permissions',
        },
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Access denied - insufficient permissions');
    });

    it('returns not found message for 404 status code', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Not found',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: {
          code: 'not_found',
          status_code: 404,
          raw_error: 'Endpoint not found',
        },
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Endpoint not found');
    });

    it('returns timeout message for timeout error', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Request timeout',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: {
          code: 'timeout',
          status_code: 408,
          raw_error: 'Connection timed out',
        },
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Connection timeout');
    });

    it('returns unreachable message for connection error', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Connection failed',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: {
          code: 'connection_error',
          status_code: 500,
          raw_error: 'Failed to connect',
        },
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Server unreachable');
    });

    it('returns unreachable message for CONNECTION_FAILED error', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Connection failed',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: {
          code: 'CONNECTION_FAILED',
          status_code: 500,
          raw_error: 'Failed to connect',
        },
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Server unreachable');
    });

    it('falls back to status message when error details exist but no specific match', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Custom error message',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: {
          code: 'unknown_error',
          status_code: 500,
          raw_error: 'Something went wrong',
        },
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Custom error message');
    });

    it('returns status unknown when no error details and not connected', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Unknown error',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
      };

      const result = getStatusErrorMessage(status);
      expect(result).toBe('Status unknown');
    });
  });

  describe('processServerStatus', () => {
    it('returns connected for connected status', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'connected',
        message: 'OK',
        last_checked: Date.now(),
        server_info: { name: 'test', version: '1.0', protocol_version: '2024-11-05' },
      };

      const result = processServerStatus(status);
      expect(result).toBe('connected');
    });

    it('returns auth_required for 400 status code', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Bad request',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: { code: 'bad_request', status_code: 400, raw_error: 'Bad request' },
      };

      const result = processServerStatus(status);
      expect(result).toBe('auth_required');
    });

    it('returns auth_required for 401 status code', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Unauthorized',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: { code: 'unauthorized', status_code: 401, raw_error: 'Unauthorized' },
      };

      const result = processServerStatus(status);
      expect(result).toBe('auth_required');
    });

    it('returns auth_required for 403 status code', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Forbidden',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: { code: 'forbidden', status_code: 403, raw_error: 'Forbidden' },
      };

      const result = processServerStatus(status);
      expect(result).toBe('auth_required');
    });

    it('returns unreachable for 404 status code', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Not found',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: { code: 'not_found', status_code: 404, raw_error: 'Not found' },
      };

      const result = processServerStatus(status);
      expect(result).toBe('unreachable');
    });

    it('returns unreachable for 5xx status codes', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Server error',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: {
          code: 'server_error',
          status_code: 500,
          raw_error: 'Internal server error',
        },
      };

      const result = processServerStatus(status);
      expect(result).toBe('unreachable');
    });

    it('returns unreachable for timeout errors', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Timeout',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: { code: 'timeout', status_code: 408, raw_error: 'Request timeout' },
      };

      const result = processServerStatus(status);
      expect(result).toBe('unreachable');
    });

    it('returns unknown when no error details and not connected', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Unknown error',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
      };

      const result = processServerStatus(status);
      expect(result).toBe('unknown');
    });

    it('returns unreachable for unhandled error codes', () => {
      const status: MCPConnectionStatus = {
        server_url: 'https://example.com',
        status: 'error',
        message: 'Unknown error',
        last_checked: Date.now(),
        server_info: { name: '', version: '', protocol_version: '' },
        error_details: { code: 'unknown_error', status_code: 418, raw_error: 'Teapot error' },
      };

      const result = processServerStatus(status);
      expect(result).toBe('unreachable');
    });
  });

  describe('getSelectedServersForAPI', () => {
    const mockServers = [
      {
        name: 'Server 1',
        url: 'http://server1.com',
        transport: 'sse' as const,
        description: 'Test server 1',
        logo: null,
        status: 'healthy' as const,
      },
      {
        name: 'Server 2',
        url: 'http://server2.com',
        transport: 'sse' as const,
        description: 'Test server 2',
        logo: null,
        status: 'healthy' as const,
      },
    ];

    const mockServerStatuses = new Map([
      ['http://server1.com', { status: 'connected' as const, message: 'Connected' }],
      ['http://server2.com', { status: 'unreachable' as const, message: 'Failed to connect' }],
    ]);

    const mockServerTokens = new Map([
      ['http://server1.com', { token: 'token1', authenticated: true, autoConnected: false }],
      ['http://server2.com', { token: 'token2', authenticated: false, autoConnected: false }],
    ]);

    it('should return API-ready server configs for connected and authenticated servers', () => {
      const selectedServerIds = ['http://server1.com', 'http://server2.com'];

      const result = getSelectedServersForAPI(
        selectedServerIds,
        mockServers,
        mockServerStatuses,
        mockServerTokens,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        server_label: 'Server 1',
        server_url: 'http://server1.com',
        headers: {
          Authorization: 'Bearer token1',
        },
      });
    });

    it('should handle Bearer prefix in token', () => {
      const mockTokensWithBearer = new Map([
        [
          'http://server1.com',
          { token: 'Bearer existing-token', authenticated: true, autoConnected: false },
        ],
      ]);

      const result = getSelectedServersForAPI(
        ['http://server1.com'],
        mockServers,
        mockServerStatuses,
        mockTokensWithBearer,
      );

      expect(result[0].headers.Authorization).toBe('Bearer existing-token');
    });

    it('should include auto-connected servers without tokens', () => {
      const mockAutoConnectedTokens = new Map([
        ['http://server1.com', { token: '', authenticated: false, autoConnected: true }],
      ]);

      const result = getSelectedServersForAPI(
        ['http://server1.com'],
        mockServers,
        mockServerStatuses,
        mockAutoConnectedTokens,
      );

      expect(result).toHaveLength(1);
      expect(result[0].headers).toEqual({});
    });

    it('should exclude servers that are not selected', () => {
      const result = getSelectedServersForAPI(
        ['http://server1.com'],
        mockServers,
        mockServerStatuses,
        mockServerTokens,
      );

      expect(result).toHaveLength(1);
      expect(result[0].server_url).toBe('http://server1.com');
    });

    it('should exclude servers that are not connected or authenticated', () => {
      const result = getSelectedServersForAPI(
        ['http://server2.com'], // This server is unreachable and not authenticated
        mockServers,
        mockServerStatuses,
        mockServerTokens,
      );

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no servers are selected', () => {
      const result = getSelectedServersForAPI(
        [],
        mockServers,
        mockServerStatuses,
        mockServerTokens,
      );

      expect(result).toHaveLength(0);
    });
  });
});
