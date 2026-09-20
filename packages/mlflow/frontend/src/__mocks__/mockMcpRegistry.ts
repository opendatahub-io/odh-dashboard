/* eslint-disable camelcase */
import { mockMcpServerJson } from '~/__mocks__/mockMcpCatalog';
import type {
  MCPIcon,
  MCPServerVersion,
  MCPTagEntry,
  RegisterMCPServerRequest,
  RegisterMCPServerResult,
} from '~/odh/types/mcpRegistryTypes';

export const mockMcpIcon = (partial?: Partial<MCPIcon>): MCPIcon => ({
  src: 'https://example.com/icon.svg',
  ...partial,
});

export const mockMcpTagEntry = (partial?: Partial<MCPTagEntry>): MCPTagEntry => ({
  key: 'team',
  value: 'platform',
  ...partial,
});

export const mockMcpServerVersion = (partial?: Partial<MCPServerVersion>): MCPServerVersion => ({
  name: 'kubernetes/mcp-server',
  version: '1.0.0',
  server_json: mockMcpServerJson(),
  ...partial,
});

export const mockRegisterMCPServerRequest = (
  partial?: Partial<RegisterMCPServerRequest>,
): RegisterMCPServerRequest => ({
  name: 'kubernetes/mcp-server',
  server_json: mockMcpServerJson(),
  ...partial,
});

export const mockRegisterMCPServerResult = (
  partial?: Partial<RegisterMCPServerResult>,
): RegisterMCPServerResult => ({
  version: mockMcpServerVersion(),
  ...partial,
});
