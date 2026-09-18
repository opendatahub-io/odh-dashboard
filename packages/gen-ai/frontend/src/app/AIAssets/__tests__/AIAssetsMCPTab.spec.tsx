import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardConfigContext } from '@odh-dashboard/plugin-core';
import type { MCPServerFromAPI } from '~/app/types';
import useFetchMCPServers from '~/app/hooks/useFetchMCPServers';
import useMCPServerStatuses from '~/app/hooks/useMCPServerStatuses';
import AIAssetsMCPTab from '~/app/AIAssets/AIAssetsMCPTab';

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

const withDashboardConfig = (overrides: Record<string, unknown>) => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      DashboardConfigContext.Provider,
      {
        value: {
          dashboardConfig: overrides,
        } as React.ContextType<typeof DashboardConfigContext>,
      },
      children,
    );
  return wrapper;
};

describe('AIAssetsMCPTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseFetchMCPServers.mockReturnValue({
      data: [],
      configMapName: null,
      registryAvailable: false,
      loaded: false,
      error: undefined,
      refetch: jest.fn(),
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    const { container } = render(<AIAssetsMCPTab />);

    expect(container.querySelector('.pf-v6-c-spinner')).toBeInTheDocument();
  });

  it('should render error state when fetch fails', () => {
    mockUseFetchMCPServers.mockReturnValue({
      data: [],
      configMapName: null,
      registryAvailable: false,
      loaded: true,
      error: new Error('ConfigMap not found'),
      refetch: jest.fn(),
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    render(<AIAssetsMCPTab />);

    expect(screen.getByText('Unable to load MCP servers')).toBeInTheDocument();
    expect(
      screen.getByText('An error occurred while loading MCP servers. Try refreshing the page.'),
    ).toBeInTheDocument();
  });

  it('should render empty state when no servers and registry unavailable', () => {
    mockUseFetchMCPServers.mockReturnValue({
      data: [],
      configMapName: null,
      registryAvailable: false,
      loaded: true,
      error: undefined,
      refetch: jest.fn(),
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    render(<AIAssetsMCPTab />);

    expect(screen.getByText('Unable to load MCP servers')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The MCP registry is unavailable and no manually configured servers exist in this project.',
      ),
    ).toBeInTheDocument();
  });

  it('should render empty state when no servers but registry is available', () => {
    mockUseFetchMCPServers.mockReturnValue({
      data: [],
      configMapName: null,
      registryAvailable: true,
      loaded: true,
      error: undefined,
      refetch: jest.fn(),
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    render(<AIAssetsMCPTab />);

    expect(screen.getByText('No MCP servers available')).toBeInTheDocument();
    expect(screen.getByText('No MCP servers are configured for this project.')).toBeInTheDocument();
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
      configMapName: null,
      registryAvailable: false,
      loaded: true,
      error: undefined,
      refetch: jest.fn(),
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    render(<AIAssetsMCPTab />);

    expect(screen.getByTestId('mcp-servers-table')).toBeInTheDocument();
    expect(screen.getByTestId('server-server-1')).toBeInTheDocument();
    expect(screen.getByText('server-1')).toBeInTheDocument();
  });

  it('should show registry unavailable banner when mcpRegistry flag is enabled and registry is down', () => {
    mockUseFetchMCPServers.mockReturnValue({
      data: [
        { name: 'server-1', url: 'http://example.com', transport: 'sse', logo: '' },
      ] as MCPServerFromAPI[],
      configMapName: null,
      registryAvailable: false,
      loaded: true,
      error: undefined,
      refetch: jest.fn(),
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    render(<AIAssetsMCPTab />, { wrapper: withDashboardConfig({ mcpRegistry: true }) });

    expect(screen.getByText('MCP registry unavailable')).toBeInTheDocument();
  });

  it('should not show registry unavailable banner when mcpRegistry flag is disabled', () => {
    mockUseFetchMCPServers.mockReturnValue({
      data: [
        { name: 'server-1', url: 'http://example.com', transport: 'sse', logo: '' },
      ] as MCPServerFromAPI[],
      configMapName: null,
      registryAvailable: false,
      loaded: true,
      error: undefined,
      refetch: jest.fn(),
    });

    mockUseMCPServerStatuses.mockReturnValue({
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      checkServerStatus: jest.fn(),
    });

    render(<AIAssetsMCPTab />);

    expect(screen.queryByText('MCP registry unavailable')).not.toBeInTheDocument();
  });
});
