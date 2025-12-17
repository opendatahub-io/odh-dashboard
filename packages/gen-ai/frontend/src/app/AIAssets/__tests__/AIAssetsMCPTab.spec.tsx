import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { GenAiContext } from '~/app/context/GenAiContext';
import type { MCPServerFromAPI } from '~/app/types';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';
import useMCPServerStatuses from '~/app/hooks/useMCPServerStatuses';
import AIAssetsMCPTab from '~/app/AIAssets/AIAssetsMCPTab';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('~/app/hooks/useFetchMCPServers', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/hooks/useMCPServerStatuses', () => ({
  __esModule: true,
  default: jest.fn(),
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

const mockUseFetchMCPServers = jest.mocked(useFetchMCPServers);
const mockUseMCPServerStatuses = jest.mocked(useMCPServerStatuses);

describe('AIAssetsMCPTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseFetchMCPServers.mockReturnValue({
      data: [],
      loaded: false,
      error: undefined,
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    const { container } = render(
      <GenAiContext.Provider value={mockGenAiContextValue}>
        <AIAssetsMCPTab />
      </GenAiContext.Provider>,
    );

    // Check for spinner element (loading state)
    expect(container.querySelector('.pf-v6-c-spinner')).toBeInTheDocument();
  });

  it('should render error state when fetch fails', () => {
    mockUseFetchMCPServers.mockReturnValue({
      data: [],
      loaded: true,
      error: new Error('ConfigMap not found'),
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    render(
      <GenAiContext.Provider value={mockGenAiContextValue}>
        <AIAssetsMCPTab />
      </GenAiContext.Provider>,
    );

    expect(screen.getByText('No MCP configuration found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This playground does not have an MCP configuration. Contact your cluster administrator to add MCP servers.',
      ),
    ).toBeInTheDocument();
  });

  it('should render empty state when no servers are available', () => {
    mockUseFetchMCPServers.mockReturnValue({
      data: [],
      loaded: true,
      error: undefined,
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    render(
      <GenAiContext.Provider value={mockGenAiContextValue}>
        <AIAssetsMCPTab />
      </GenAiContext.Provider>,
    );

    expect(screen.getByText('No valid MCP servers available')).toBeInTheDocument();
    expect(
      screen.getByText(
        'An MCP configuration exists, but no valid servers were found. Contact your cluster administrator to update the configuration.',
      ),
    ).toBeInTheDocument();
  });

  it('should render MCP servers table when servers exist', () => {
    mockUseFetchMCPServers.mockReturnValue({
      data: [
        {
          name: 'server-1',
          url: 'http://example.com',
          transport: 'sse',
          logo: '',
        },
      ] as MCPServerFromAPI[],
      loaded: true,
      error: undefined,
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    render(
      <GenAiContext.Provider value={mockGenAiContextValue}>
        <AIAssetsMCPTab />
      </GenAiContext.Provider>,
    );

    expect(screen.getByTestId('mcp-servers-table')).toBeInTheDocument();
    expect(screen.getByTestId('server-server-1')).toBeInTheDocument();
    expect(screen.getByText('server-1')).toBeInTheDocument();
    // Note: checkServerStatus is now called internally by useMCPServerStatuses hook
  });
});
