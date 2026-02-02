/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ViewCodeModal from '~/app/Chatbot/components/ViewCodeModal';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { FileModel } from '~/app/types';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';
import { useChatbotConfigStore, ChatbotConfigStore } from '~/app/Chatbot/store';

jest.mock('~/app/hooks/useFetchVectorStores');
jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('~/app/Chatbot/store', () => ({
  ...jest.requireActual('~/app/Chatbot/store'),
  useChatbotConfigStore: jest.fn(),
}));

const mockUseFetchVectorStores = jest.mocked(useFetchVectorStores);
const mockUseGenAiAPI = useGenAiAPI as jest.Mock;
const mockUseChatbotConfigStore = jest.mocked(useChatbotConfigStore);
const mockExportCode = jest.fn();

// Create a shared mock store that will be modified per test
let mockStore: ChatbotConfigStore | undefined;

const createMockStore = (configOverrides = {}) => {
  const defaultConfig = {
    selectedModel: 'test-model',
    systemInstruction: 'You are a helpful assistant.',
    selectedMcpServerIds: [],
    temperature: 0.1,
    isStreamingEnabled: true,
    guardrailsEnabled: false,
    mcpToolSelections: {},
    ...configOverrides,
  };

  return {
    configurations: {
      default: defaultConfig,
    },
    configIds: ['default'],
    getToolSelections: jest.fn().mockReturnValue(undefined),
  } as unknown as ChatbotConfigStore;
};

const setupMockStore = (configOverrides = {}) => {
  mockStore = createMockStore(configOverrides);

  // Reset the mock implementation with the new store
  mockUseChatbotConfigStore.mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStore as ChatbotConfigStore);
    }
    return undefined;
  });

  // Mock getState to return the mockStore
  (mockUseChatbotConfigStore as unknown as { getState: () => ChatbotConfigStore }).getState =
    jest.fn(() => mockStore as ChatbotConfigStore);
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <GenAiContext.Provider value={mockGenAiContextValue}>{children}</GenAiContext.Provider>
);

describe('ViewCodeModal', () => {
  const mockFiles: FileModel[] = [
    {
      id: 'file-1',
      filename: 'document.pdf',
      bytes: 1024,
      created_at: 1609459200,
      purpose: 'assistants',
      object: 'file',
      status: 'completed',
      expires_at: 1612137600,
      status_details: '',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onToggle: jest.fn(),
    configId: 'default',
    input: 'What is machine learning?',
    files: mockFiles,
  };

  const mockVectorStore = {
    id: 'vs-1',
    name: 'test-vector-store',
    object: 'vector_store',
    created_at: 1609459200,
    last_active_at: 1609459200,
    metadata: { provider_id: 'test-provider' },
    status: 'completed' as const,
    file_counts: {
      cancelled: 0,
      completed: 1,
      failed: 0,
      in_progress: 0,
      total: 1,
    },
    usage_bytes: 1024,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFetchVectorStores.mockReturnValue([[mockVectorStore], true, undefined, jest.fn()]);

    mockExportCode.mockResolvedValue({
      code: 'import llama_stack\n\nprint("Hello World")',
    });

    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: true,
      api: {
        exportCode: mockExportCode,
      },
      refreshAllAPI: jest.fn(),
    });

    // Mock Zustand store to return config values
    setupMockStore();
  });

  it('renders modal with loading state initially', () => {
    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    expect(screen.getByText('Playground configuration')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} isOpen={false} />
      </TestWrapper>,
    );

    expect(screen.queryByText('Playground configuration')).not.toBeInTheDocument();
  });

  it('fetches and displays code when opened', async () => {
    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'What is machine learning?',
          model: 'test-model',
          instructions: 'You are a helpful assistant.',
          stream: false,
          files: [{ file: 'document.pdf', purpose: 'assistants' }],
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('shows error when API is not available', async () => {
    mockUseGenAiAPI.mockReturnValue({
      apiAvailable: false,
      api: {
        exportCode: mockExportCode,
      },
      refreshAllAPI: jest.fn(),
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Error exporting code')).toBeInTheDocument();
      expect(screen.getByText('API is not available')).toBeInTheDocument();
    });
  });

  it('shows error when vector stores are not loaded', async () => {
    mockUseFetchVectorStores.mockReturnValue([[], false, undefined, jest.fn()]);

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Error exporting code')).toBeInTheDocument();
      expect(screen.getByText('Vector stores not loaded')).toBeInTheDocument();
    });
  });

  it('shows error when API call fails', async () => {
    mockExportCode.mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Error exporting code')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('includes MCP servers in request when selected', async () => {
    const mockServer = {
      url: 'http://test-server',
      name: 'Test Server',
      transport: 'sse' as const,
      description: 'Test Server Description',
      logo: null,
      status: 'healthy' as const,
    };

    // Mock store to return selected MCP servers
    setupMockStore({ selectedMcpServerIds: ['http://test-server'] });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} mcpServers={[mockServer]} mcpServerTokens={new Map()} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp_servers: expect.arrayContaining([
            expect.objectContaining({
              server_url: 'http://test-server',
              server_label: 'Test Server',
            }),
          ]),
        }),
      );
    });
  });

  it('includes allowed_tools in MCP server config when toolSelections returns tools', async () => {
    const mockServer = {
      url: 'http://test-server',
      name: 'Test Server',
      transport: 'sse' as const,
      description: 'Test Server Description',
      logo: null,
      status: 'healthy' as const,
    };

    const mockGetToolSelections = jest.fn((configId: string, ns: string, url: string) => {
      if (configId === 'default' && ns === 'test-namespace' && url === 'http://test-server') {
        return ['tool1', 'tool2'];
      }
      return undefined;
    });

    // Mock store to return selected MCP servers and tool selections
    setupMockStore({ selectedMcpServerIds: ['http://test-server'] });
    mockStore!.getToolSelections = mockGetToolSelections;

    render(
      <TestWrapper>
        <ViewCodeModal
          {...defaultProps}
          mcpServers={[mockServer]}
          mcpServerTokens={new Map()}
          namespace="test-namespace"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp_servers: expect.arrayContaining([
            expect.objectContaining({
              server_url: 'http://test-server',
              server_label: 'Test Server',
              allowed_tools: ['tool1', 'tool2'],
            }),
          ]),
        }),
      );
    });
  });

  it('does not include allowed_tools when toolSelections returns undefined', async () => {
    const mockServer = {
      url: 'http://test-server',
      name: 'Test Server',
      transport: 'sse' as const,
      description: 'Test Server Description',
      logo: null,
      status: 'healthy' as const,
    };

    const mockGetToolSelections = jest.fn(() => undefined);

    // Mock store to return selected MCP servers with no tool selections
    setupMockStore({ selectedMcpServerIds: ['http://test-server'] });
    mockStore!.getToolSelections = mockGetToolSelections;

    render(
      <TestWrapper>
        <ViewCodeModal
          {...defaultProps}
          mcpServers={[mockServer]}
          mcpServerTokens={new Map()}
          namespace="test-namespace"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp_servers: expect.arrayContaining([
            expect.objectContaining({
              server_url: 'http://test-server',
              server_label: 'Test Server',
            }),
          ]),
        }),
      );
    });

    // Verify allowed_tools is NOT in the request
    const callArgs = mockExportCode.mock.calls[0][0];
    expect(callArgs.mcp_servers[0]).not.toHaveProperty('allowed_tools');
  });

  it('includes empty allowed_tools array when toolSelections returns empty array', async () => {
    const mockServer = {
      url: 'http://test-server',
      name: 'Test Server',
      transport: 'sse' as const,
      description: 'Test Server Description',
      logo: null,
      status: 'healthy' as const,
    };

    const mockGetToolSelections = jest.fn(() => []);

    // Mock store to return selected MCP servers with empty tool selections
    setupMockStore({ selectedMcpServerIds: ['http://test-server'] });
    mockStore!.getToolSelections = mockGetToolSelections;

    render(
      <TestWrapper>
        <ViewCodeModal
          {...defaultProps}
          mcpServers={[mockServer]}
          mcpServerTokens={new Map()}
          namespace="test-namespace"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          mcp_servers: expect.arrayContaining([
            expect.objectContaining({
              server_url: 'http://test-server',
              server_label: 'Test Server',
              allowed_tools: [],
            }),
          ]),
        }),
      );
    });
  });

  it('re-fetches code when modal is reopened', async () => {
    const { rerender } = render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} isOpen={false} />
      </TestWrapper>,
    );

    expect(mockExportCode).not.toHaveBeenCalled();

    rerender(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} isOpen />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledTimes(1);
    });
  });

  it('includes file_search tool when RAG is enabled and files are present', async () => {
    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} isRagEnabled />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [{ type: 'file_search', vector_store_ids: ['vs-1'] }],
          files: [{ file: 'document.pdf', purpose: 'assistants' }],
        }),
      );
    });
  });

  it('does not include tools when RAG is disabled even with files present', async () => {
    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} isRagEnabled={false} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [{ file: 'document.pdf', purpose: 'assistants' }],
        }),
      );
    });

    // Verify that tools was not included in the request
    const callArg = mockExportCode.mock.calls[0][0];
    expect(callArg.tools).toBeUndefined();
  });

  it('does not include tools when RAG is enabled but no files are present', async () => {
    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} files={[]} isRagEnabled />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [],
        }),
      );
    });

    // Verify that tools was not included in the request
    const callArg = mockExportCode.mock.calls[0][0];
    expect(callArg.tools).toBeUndefined();
  });
});
