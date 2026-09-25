import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import MCPServersPanel from '~/app/Chatbot/mcp/MCPServersPanel';
import { GenAiContext } from '~/app/context/GenAiContext';
import { MCPServer, MCPServerFromAPI } from '~/app/types/mcp';
import useGenAiMcpRegistryServers from '~/app/hooks/useGenAiMcpRegistryServers';
import useServerSelection from '~/app/Chatbot/mcp/hooks/useServerSelection';
import useModalState from '~/app/Chatbot/mcp/hooks/useModalState';

// --- Mock dependencies ---

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('~/app/hooks/useGenAiAPI', () => ({
  useGenAiAPI: jest.fn(() => ({ api: {}, apiAvailable: true })),
}));

jest.mock('~/app/hooks/useGenAiMcpRegistryServers', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/app/Chatbot/store', () => ({
  useChatbotConfigStore: Object.assign(
    jest.fn(() => []),
    {
      getState: jest.fn(() => ({
        getToolSelections: jest.fn(),
        updateSelectedMcpServerIds: jest.fn(),
      })),
    },
  ),
  selectSelectedMcpServerIds: jest.fn(() => jest.fn(() => [])),
}));

jest.mock('mod-arch-shared', () => ({
  useCheckboxTableBase: jest.fn(() => ({
    isSelected: jest.fn(() => false),
    toggleSelection: jest.fn(),
  })),
  Table: ({
    data,
    rowRenderer,
    ...props
  }: {
    data: Array<{ id: string; name: string }>;
    rowRenderer: (item: { id: string; name: string }) => React.ReactNode;
    [key: string]: unknown;
  }) => (
    <table data-testid={props['data-testid'] as string}>
      <tbody>{data.map((item) => rowRenderer(item))}</tbody>
    </table>
  ),
}));

jest.mock('../hooks/useModalState', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isOpen: false,
    selectedItem: null,
    openModal: jest.fn(),
    closeModal: jest.fn(),
  })),
}));

jest.mock('../hooks/useServerTokens', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    serverTokens: new Map(),
    updateToken: jest.fn(),
    removeToken: jest.fn(),
    getToken: jest.fn(() => undefined),
  })),
}));

jest.mock('../hooks/useServerTools', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    serverToolsCount: new Map(),
    fetchingToolsServers: new Set(),
    fetchToolsCount: jest.fn(),
  })),
}));

jest.mock('../hooks/useTokenValidation', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    validatingServers: new Set(),
    checkingServers: new Set(),
    validationErrors: new Map(),
    handleLockClick: jest.fn(),
    validateServerToken: jest.fn(),
    clearValidationError: jest.fn(),
  })),
}));

jest.mock('../hooks/useServerSelection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../hooks/useAutoUnlock', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    autoUnlockingServers: new Set(),
  })),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('../MCPServerPanelRow', () => ({
  __esModule: true,
  default: ({ server }: { server: { id: string; name: string } }) => (
    <tr data-testid={`mcp-server-row-${server.id}`}>
      <td>{server.name}</td>
    </tr>
  ),
}));

jest.mock('../MCPServerConfigModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../MCPServerToolsModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../MCPServerSuccessModal', () => ({
  __esModule: true,
  default: () => null,
}));

// --- Helpers ---

const mockGenAiContextValue = {
  namespace: { name: 'test-ns' },
  apiState: { apiAvailable: true, api: {} },
  refreshAPIState: jest.fn(),
};

const mockUseGenAiMcpRegistryServers = jest.mocked(useGenAiMcpRegistryServers);
const mockUseServerSelection = jest.mocked(useServerSelection);
const mockUseModalState = jest.mocked(useModalState);

const createServer = (overrides: Partial<MCPServerFromAPI> = {}): MCPServerFromAPI => ({
  name: 'test-server',
  url: 'http://test-server:8080/sse',
  transport: 'sse',
  description: 'A test server',
  logo: null,
  status: 'healthy',
  version: '1.0.0',
  source: 'configmap',
  tools: [],
  // eslint-disable-next-line camelcase
  tool_count: 0,
  ...overrides,
});

type MCPServersPanelProps = React.ComponentProps<typeof MCPServersPanel>;

const renderPanel = (props: Partial<MCPServersPanelProps> = {}) => {
  const defaultProps: MCPServersPanelProps = {
    configId: 'test-config',
    servers: [],
    serversLoaded: true,
    serversLoadError: null,
    registryAvailable: false,
    serverTokens: new Map(),
    onServerTokensChange: jest.fn(),
    checkServerStatus: jest.fn().mockResolvedValue({ status: 'connected' }),
  };
  return render(
    <GenAiContext.Provider
      value={
        mockGenAiContextValue as unknown as React.ComponentProps<
          typeof GenAiContext.Provider
        >['value']
      }
    >
      <MCPServersPanel {...defaultProps} {...props} />
    </GenAiContext.Provider>,
  );
};

// --- Tests ---

describe('MCPServersPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenAiMcpRegistryServers.mockReturnValue(false);
    mockUseServerSelection.mockReturnValue({
      selectedServers: [],
      isInitialLoadComplete: true,
      setSelectedServers: jest.fn(),
    });
  });

  describe('Loading and error states', () => {
    it('should show loading state when serversLoaded is false', () => {
      renderPanel({ serversLoaded: false });
      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('should show error state when serversLoadError is set', () => {
      renderPanel({ serversLoadError: new Error('Server fetch failed') });
      expect(screen.getByTestId('mcp-servers-load-error')).toBeInTheDocument();
      expect(screen.getByText('No MCP servers available')).toBeInTheDocument();
    });
  });

  describe('Flat layout (no registry)', () => {
    it('should show Manual Connection section with servers when registryAvailable is false', () => {
      const servers = [
        createServer({ name: 'Server A', url: 'http://a:8080/sse' }),
        createServer({ name: 'Server B', url: 'http://b:8080/sse' }),
      ];
      renderPanel({ servers, registryAvailable: false });

      expect(screen.getByTestId('mcp-manual-section')).toBeInTheDocument();
      expect(screen.getByTestId('mcp-manual-servers-table')).toBeInTheDocument();
      expect(screen.getByText('Manual Connection')).toBeInTheDocument();
    });

    it('should show Manual Connection empty state when no servers and registryAvailable is false', () => {
      renderPanel({ servers: [], registryAvailable: false });

      expect(screen.getByTestId('mcp-manual-section')).toBeInTheDocument();
      expect(screen.getByTestId('mcp-manual-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No manual servers configured')).toBeInTheDocument();
    });

    it('should not show Registered section when registryAvailable is false', () => {
      renderPanel({ servers: [], registryAvailable: false });

      expect(screen.queryByTestId('mcp-registered-section')).not.toBeInTheDocument();
    });

    it('should filter out registry servers when registryAvailable is false', () => {
      const servers = [
        createServer({
          name: 'Registry Server',
          url: 'http://registry:8080/sse',
          source: 'registry',
        }),
        createServer({ name: 'Manual Server', url: 'http://manual:8080/sse', source: 'configmap' }),
      ];
      renderPanel({ servers, registryAvailable: false });

      // Only the manual server should render in the table; registry server is filtered out
      // The Table mock renders each row. manualServers is filtered to exclude registry.
      expect(screen.getByTestId('mcp-server-row-http://manual:8080/sse')).toBeInTheDocument();
      expect(
        screen.queryByTestId('mcp-server-row-http://registry:8080/sse'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Grouped layout (with registry)', () => {
    const registryServer = createServer({
      name: 'Registry Server',
      url: 'http://registry:8080/sse',
      source: 'registry',
    });

    const manualServer = createServer({
      name: 'Manual Server',
      url: 'http://manual:8080/sse',
      source: 'configmap',
    });

    beforeEach(() => {
      mockUseGenAiMcpRegistryServers.mockReturnValue(true);
    });

    it('should show both Registered and Manual Connection sections when registryAvailable is true and registry servers exist', () => {
      renderPanel({
        servers: [registryServer, manualServer],
        registryAvailable: true,
      });

      expect(screen.getByTestId('mcp-registered-section')).toBeInTheDocument();
      expect(screen.getByTestId('mcp-manual-section')).toBeInTheDocument();
      expect(screen.getByText('Registered')).toBeInTheDocument();
      expect(screen.getByText('Manual Connection')).toBeInTheDocument();
    });

    it('should show Registered section with correct server count badge', () => {
      renderPanel({
        servers: [registryServer],
        registryAvailable: true,
      });

      const badge = screen.getByTestId('mcp-registered-count-badge');
      expect(badge).toBeInTheDocument();
      // 0 selected out of 1 total server
      expect(badge).toHaveTextContent('0 of 1 servers on');
    });

    it('should show "Manage servers in AI Hub" in kebab menu', () => {
      renderPanel({
        servers: [registryServer],
        registryAvailable: true,
      });

      const kebab = screen.getByTestId('mcp-registered-kebab');
      fireEvent.click(kebab);

      const manageLink = screen.getByTestId('mcp-manage-servers-link');
      expect(manageLink).toBeInTheDocument();
      expect(manageLink).toHaveTextContent('Manage servers in AI Hub');
    });

    it('should show Manual Connection empty state in grouped layout when no manual servers', () => {
      renderPanel({
        servers: [registryServer],
        registryAvailable: true,
      });

      expect(screen.getByTestId('mcp-manual-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No manual servers configured')).toBeInTheDocument();
    });

    it('should not show Registered section when registryAvailable is true but no registry servers', () => {
      renderPanel({
        servers: [manualServer],
        registryAvailable: true,
      });

      // Falls back to flat layout when there are no registry servers
      expect(screen.queryByTestId('mcp-registered-section')).not.toBeInTheDocument();
      expect(screen.getByTestId('mcp-manual-section')).toBeInTheDocument();
    });
  });

  it('should hide registered servers and keep manual servers when the flag is disabled', () => {
    const registryServer = createServer({
      name: 'Registry Server',
      url: 'http://registry:8080/sse',
      source: 'registry',
    });
    const manualServer = createServer({
      name: 'Manual Server',
      url: 'http://manual:8080/sse',
      source: 'configmap',
    });

    renderPanel({
      servers: [registryServer, manualServer],
      registryAvailable: true,
    });

    expect(screen.queryByTestId('mcp-registered-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mcp-server-row-http://registry:8080/sse')).not.toBeInTheDocument();
    expect(screen.getByTestId('mcp-server-row-http://manual:8080/sse')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-manual-section')).toBeInTheDocument();
  });

  it('should clear selected registered servers when the flag is disabled', () => {
    const registryServer = createServer({
      name: 'Registry Server',
      url: 'http://registry:8080/sse',
      source: 'registry',
    });
    const setSelectedServers = jest.fn();
    const selectedRegistryServer: MCPServer = {
      id: registryServer.url,
      name: registryServer.name,
      description: registryServer.description,
      status: 'active',
      endpoint: 'View',
      connectionUrl: registryServer.url,
      tools: 0,
      version: registryServer.version,
      source: 'registry',
      logo: registryServer.logo,
    };
    mockUseServerSelection.mockReturnValue({
      selectedServers: [selectedRegistryServer],
      isInitialLoadComplete: true,
      setSelectedServers,
    });

    renderPanel({ servers: [registryServer], registryAvailable: true });

    expect(setSelectedServers).toHaveBeenCalledWith([]);
  });

  it('should close open registered-server modals when the flag is disabled', () => {
    const registryServer: MCPServer = {
      id: 'registry-server',
      name: 'Registry Server',
      description: 'A registry server',
      status: 'active',
      endpoint: 'View',
      connectionUrl: 'http://registry:8080/sse',
      tools: 0,
      version: '1.0.0',
      source: 'registry',
      logo: null,
    };
    const closeConfigModal = jest.fn();
    const closeToolsModal = jest.fn();
    const closeSuccessModal = jest.fn();

    mockUseModalState
      .mockReturnValueOnce({
        isOpen: true,
        selectedItem: registryServer,
        openModal: jest.fn(),
        closeModal: closeConfigModal,
      })
      .mockReturnValueOnce({
        isOpen: true,
        selectedItem: registryServer,
        openModal: jest.fn(),
        closeModal: closeToolsModal,
      })
      .mockReturnValueOnce({
        isOpen: true,
        selectedItem: registryServer,
        openModal: jest.fn(),
        closeModal: closeSuccessModal,
      });

    renderPanel({
      servers: [
        createServer({
          name: registryServer.name,
          url: registryServer.connectionUrl,
          source: 'registry',
        }),
      ],
      registryAvailable: true,
    });

    expect(closeConfigModal).toHaveBeenCalled();
    expect(closeToolsModal).toHaveBeenCalled();
    expect(closeSuccessModal).toHaveBeenCalled();
  });

  describe('Section toggles', () => {
    it('should collapse Manual Connection section when toggle is clicked', () => {
      renderPanel({
        servers: [createServer()],
        registryAvailable: false,
      });

      const toggleButton = screen.getByRole('button', { name: /manual connection/i });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
