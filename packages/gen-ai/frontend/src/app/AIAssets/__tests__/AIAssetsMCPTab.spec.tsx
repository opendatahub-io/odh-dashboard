import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { GenAiContext } from '~/app/context/GenAiContext';
import type { MCPServerFromAPI } from '~/app/types';
import { useMCPServers } from '~/app/hooks/useMCPServers';
import AIAssetsMCPTab from '~/app/AIAssets/AIAssetsMCPTab';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('~/app/context/MCPContextProvider', () => ({
  MCPDataProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('~/app/hooks/useMCPServers', () => ({
  useMCPServers: jest.fn(),
}));

jest.mock('~/app/AIAssets/components/mcp/MCPServersTable', () => ({
  __esModule: true,
  default: ({ servers }: { servers: MCPServerFromAPI[] }) => (
    <div data-testid="mcp-servers-table">
      {servers.map((server) => (
        <div key={server.name} data-testid={`server-${server.name}`}>
          {server.name}
        </div>
      ))}
    </div>
  ),
}));

const mockUseMCPServers = jest.mocked(useMCPServers);

describe('AIAssetsMCPTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseMCPServers.mockReturnValue({
      servers: [],
      serversLoaded: false,
      serversLoadError: null,
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      allStatusesChecked: false,
      refresh: jest.fn(),
      checkServerStatus: jest.fn(),
    } as ReturnType<typeof useMCPServers>);

    render(
      <GenAiContext.Provider value={mockGenAiContextValue}>
        <AIAssetsMCPTab />
      </GenAiContext.Provider>,
    );

    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('should render MCP servers table when servers exist', () => {
    mockUseMCPServers.mockReturnValue({
      servers: [
        {
          name: 'server-1',
          url: 'http://example.com',
          transport: 'sse',
          logo: '',
        },
      ] as MCPServerFromAPI[],
      serversLoaded: true,
      serversLoadError: null,
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      allStatusesChecked: true,
      refresh: jest.fn(),
      checkServerStatus: jest.fn(),
    } as ReturnType<typeof useMCPServers>);

    render(
      <GenAiContext.Provider value={mockGenAiContextValue}>
        <AIAssetsMCPTab />
      </GenAiContext.Provider>,
    );

    expect(screen.getByTestId('mcp-servers-table')).toBeInTheDocument();
    expect(screen.getByTestId('server-server-1')).toBeInTheDocument();
    expect(screen.getByText('server-1')).toBeInTheDocument();
  });
});
