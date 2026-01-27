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
    servers,
    serversLoaded,
    serversLoadError,
    onSelectionChange,
    initialSelectedServerIds,
  }: {
    servers: MCPServerFromAPI[];
    serversLoaded: boolean;
    serversLoadError?: Error | null;
    onSelectionChange?: (serverIds: string[]) => void;
    initialSelectedServerIds?: string[];
  }) => (
    <div data-testid="mcp-servers-panel">
      <span data-testid="servers-count">{servers.length}</span>
      <span data-testid="servers-loaded">{serversLoaded.toString()}</span>
      <span data-testid="servers-error">{serversLoadError?.message || 'none'}</span>
      <span data-testid="initial-selected">{initialSelectedServerIds?.join(',') || 'none'}</span>
      <button
        data-testid="select-servers-button"
        onClick={() => onSelectionChange?.(['server-1', 'server-2'])}
      >
        Select Servers
      </button>
    </div>
  ),
}));

describe('MCPTabContent', () => {
  const mockCheckMcpServerStatus = jest.fn().mockResolvedValue({
    status: 'connected',
    tools: [],
  } as ServerStatusInfo);

  const defaultProps = {
    mcpServers: [] as MCPServerFromAPI[],
    mcpServersLoaded: true,
    mcpServersLoadError: null,
    mcpServerTokens: new Map<string, TokenInfo>(),
    onMcpServerTokensChange: jest.fn(),
    checkMcpServerStatus: mockCheckMcpServerStatus,
    onMcpServersChange: jest.fn(),
    initialSelectedServerIds: [] as string[],
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
    const servers = [
      { id: 'server-1', name: 'Server 1' },
      { id: 'server-2', name: 'Server 2' },
    ] as MCPServerFromAPI[];

    render(
      <MCPTabContent
        {...defaultProps}
        mcpServers={servers}
        initialSelectedServerIds={['server-1']}
      />,
    );

    expect(screen.getByTestId('mcp-servers-panel')).toBeInTheDocument();
    expect(screen.getByTestId('servers-count')).toHaveTextContent('2');
    expect(screen.getByTestId('servers-loaded')).toHaveTextContent('true');
    expect(screen.getByTestId('initial-selected')).toHaveTextContent('server-1');
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

  it('calls onMcpServersChange when servers are selected', async () => {
    const mockOnMcpServersChange = jest.fn();
    render(<MCPTabContent {...defaultProps} onMcpServersChange={mockOnMcpServersChange} />);

    const selectButton = screen.getByTestId('select-servers-button');
    selectButton.click();

    expect(mockOnMcpServersChange).toHaveBeenCalledWith(['server-1', 'server-2']);
  });

  it('renders with empty initial selected server ids', () => {
    render(<MCPTabContent {...defaultProps} initialSelectedServerIds={[]} />);

    expect(screen.getByTestId('initial-selected')).toHaveTextContent('none');
  });

  it('renders with multiple initial selected server ids', () => {
    render(
      <MCPTabContent
        {...defaultProps}
        initialSelectedServerIds={['server-a', 'server-b', 'server-c']}
      />,
    );

    expect(screen.getByTestId('initial-selected')).toHaveTextContent('server-a,server-b,server-c');
  });
});
