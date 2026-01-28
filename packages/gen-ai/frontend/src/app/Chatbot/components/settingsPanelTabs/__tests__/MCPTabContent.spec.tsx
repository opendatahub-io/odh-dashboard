import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MCPServerFromAPI, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import MCPTabContent from '~/app/Chatbot/components/settingsPanelTabs/MCPTabContent';

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('~/app/Chatbot/mcp/MCPServersPanel', () => ({
  __esModule: true,
  default: ({
    configId,
    servers,
    serversLoaded,
    serversLoadError,
  }: {
    configId: string;
    servers: MCPServerFromAPI[];
    serversLoaded: boolean;
    serversLoadError?: Error | null;
  }) => (
    <div data-testid="mcp-servers-panel">
      <span data-testid="config-id">{configId}</span>
      <span data-testid="servers-count">{servers.length}</span>
      <span data-testid="servers-loaded">{serversLoaded.toString()}</span>
      <span data-testid="servers-error">{serversLoadError?.message || 'none'}</span>
    </div>
  ),
}));

describe('MCPTabContent', () => {
  const mockCheckMcpServerStatus = jest.fn().mockResolvedValue({
    status: 'connected',
    message: 'Connected successfully',
    tools: [],
  } as ServerStatusInfo);

  const defaultProps = {
    configId: 'default',
    mcpServers: [] as MCPServerFromAPI[],
    mcpServersLoaded: true,
    mcpServersLoadError: null,
    mcpServerTokens: new Map<string, TokenInfo>(),
    onMcpServerTokensChange: jest.fn(),
    checkMcpServerStatus: mockCheckMcpServerStatus,
    initialServerStatuses: new Map<string, ServerStatusInfo>(),
    activeToolsCount: 0,
    onActiveToolsCountChange: jest.fn(),
    onToolsWarningChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the MCP servers title', () => {
    render(<MCPTabContent {...defaultProps} />);

    expect(screen.getByTestId('mcp-servers-section-title')).toHaveTextContent('MCP servers');
  });

  it('renders MCPServersPanel with correct props', () => {
    const servers: MCPServerFromAPI[] = [
      {
        name: 'Server 1',
        url: 'http://server-1.com',
        transport: 'sse',
        description: 'Test Server 1',
        logo: null,
        status: 'healthy',
      },
      {
        name: 'Server 2',
        url: 'http://server-2.com',
        transport: 'sse',
        description: 'Test Server 2',
        logo: null,
        status: 'healthy',
      },
    ];

    render(<MCPTabContent {...defaultProps} mcpServers={servers} />);

    expect(screen.getByTestId('mcp-servers-panel')).toBeInTheDocument();
    expect(screen.getByTestId('config-id')).toHaveTextContent('default');
    expect(screen.getByTestId('servers-count')).toHaveTextContent('2');
    expect(screen.getByTestId('servers-loaded')).toHaveTextContent('true');
  });

  it('passes serversLoaded false when not loaded', () => {
    render(<MCPTabContent {...defaultProps} mcpServersLoaded={false} />);

    expect(screen.getByTestId('servers-loaded')).toHaveTextContent('false');
  });

  it('passes error to MCPServersPanel when load error occurs', () => {
    const error = new Error('Failed to load servers');
    render(<MCPTabContent {...defaultProps} mcpServersLoadError={error} />);

    expect(screen.getByTestId('servers-error')).toHaveTextContent('Failed to load servers');
  });

  it('displays active tools badge with zero count when activeToolsCount is 0', () => {
    render(<MCPTabContent {...defaultProps} activeToolsCount={0} />);

    const badge = screen.getByTestId('active-tools-count-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('0 tools enabled');
  });

  it('displays active tools badge with singular text when activeToolsCount is 1', () => {
    render(<MCPTabContent {...defaultProps} activeToolsCount={1} />);

    const badge = screen.getByTestId('active-tools-count-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('1 tool enabled');
  });

  it('displays active tools badge with plural text when activeToolsCount is greater than 1', () => {
    render(<MCPTabContent {...defaultProps} activeToolsCount={5} />);

    const badge = screen.getByTestId('active-tools-count-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('5 tools enabled');
  });

  it('displays active tools badge with correct count for various values', () => {
    const { rerender } = render(<MCPTabContent {...defaultProps} activeToolsCount={10} />);

    expect(screen.getByTestId('active-tools-count-badge')).toHaveTextContent('10 tools enabled');

    rerender(<MCPTabContent {...defaultProps} activeToolsCount={42} />);
    expect(screen.getByTestId('active-tools-count-badge')).toHaveTextContent('42 tools enabled');
  });

  it('passes custom configId to MCPServersPanel', () => {
    render(<MCPTabContent {...defaultProps} configId="test-config" />);

    expect(screen.getByTestId('config-id')).toHaveTextContent('test-config');
  });
});
