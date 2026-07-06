/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ViewCodeModal from '~/app/Chatbot/components/ViewCodeModal';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { FileModel } from '~/app/types';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';
import { useChatbotConfigStore, ChatbotConfigStore, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';

jest.mock('~/app/hooks/useFetchVectorStores');
jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('~/app/hooks/useChatPlaygroundEnabled', () => ({
  __esModule: true,
  default: () => true,
}));
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

type MockConfig = Partial<NonNullable<ReturnType<ChatbotConfigStore['getConfiguration']>>>;

const createMockStore = (configOverrides: MockConfig = {}) => {
  const defaultConfig = {
    selectedModel: 'test-model',
    systemInstruction: 'You are a helpful assistant.',
    selectedMcpServerIds: [] as string[],
    temperature: 0.1,
    isStreamingEnabled: true,
    mcpToolSelections: {},
    isRagEnabled: false,
    knowledgeMode: 'inline' as const,
    selectedVectorStoreId: null as string | null,
    variableValues: {} as Record<string, string>,
    activePrompt: null,
    guardrail: '',
    guardrailUserInputEnabled: false,
    guardrailModelOutputEnabled: false,
    guardrailSubscription: '',
    ...configOverrides,
  };

  const configurations: Record<string, typeof defaultConfig | undefined> = {
    [DEFAULT_CONFIG_ID]: defaultConfig,
  };

  const store = {
    configurations,
    configIds: [DEFAULT_CONFIG_ID],
    getToolSelections: jest.fn().mockReturnValue(undefined),
    getConfiguration: (id: string) => configurations[id],
  };

  return store as unknown as ChatbotConfigStore;
};

const setupMockStore = (configOverrides: MockConfig = {}) => {
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
    setupMockStore({ isRagEnabled: true, knowledgeMode: 'inline', selectedVectorStoreId: 'vs-1' });

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
      if (
        configId === DEFAULT_CONFIG_ID &&
        ns === 'test-namespace' &&
        url === 'http://test-server'
      ) {
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
    // Setup store with RAG enabled
    setupMockStore({ isRagEnabled: true, knowledgeMode: 'inline', selectedVectorStoreId: 'vs-1' });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
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
    // Setup store with RAG disabled (default)
    setupMockStore({ isRagEnabled: false });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
      // Files and tools are not sent when RAG is disabled
      const callArg = mockExportCode.mock.calls[0][0];
      expect(callArg.files).toBeUndefined();
      expect(callArg.tools).toBeUndefined();
    });
  });

  it('substitutes template variables in instructions before exporting', async () => {
    setupMockStore({
      systemInstruction: 'You are a {{role}} assistant for {{topic}}.',
      variableValues: { role: 'coding', topic: 'TypeScript' },
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          instructions: 'You are a coding assistant for TypeScript.',
        }),
      );
    });
  });

  it('replaces unfilled template variables with empty string in exported code', async () => {
    setupMockStore({
      systemInstruction: 'You are a {{role}} for {{company}}.',
      variableValues: { role: 'assistant' },
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          instructions: 'You are a assistant for .',
        }),
      );
    });
  });

  it('sends prompt_variable_values when an active prompt has variable values', async () => {
    setupMockStore({
      systemInstruction: 'Review {{language}} code for {{name}}.',
      variableValues: { language: 'TypeScript', name: 'Alice' },
      activePrompt: {
        name: 'Code_reviewer',
        version: 2,
        template: 'Review {{language}} code for {{name}}.',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: { name: 'Code_reviewer', version: 2 },
          prompt_variable_values: { language: 'TypeScript', name: 'Alice' },
        }),
      );
    });
  });

  it('does not send prompt_variable_values when variable values are empty', async () => {
    setupMockStore({
      systemInstruction: 'You are a helpful assistant.',
      variableValues: {},
      activePrompt: {
        name: 'Basic_prompt',
        version: 1,
        template: 'You are a helpful assistant.',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
    });

    const callArg = mockExportCode.mock.calls[0][0];
    expect(callArg.prompt).toEqual({ name: 'Basic_prompt', version: 1 });
    expect(callArg.prompt_variable_values).toBeUndefined();
  });

  it('does not send prompt_variable_values without an active prompt', async () => {
    setupMockStore({
      systemInstruction: 'You are a {{role}} assistant.',
      variableValues: { role: 'coding' },
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
    });

    const callArg = mockExportCode.mock.calls[0][0];
    expect(callArg.prompt).toBeUndefined();
    expect(callArg.prompt_variable_values).toBeUndefined();
  });

  it('includes file_search tools but omits files when RAG is enabled with no files', async () => {
    // Setup store with RAG enabled, inline mode
    setupMockStore({ isRagEnabled: true, knowledgeMode: 'inline', selectedVectorStoreId: 'vs-1' });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} files={[]} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
      // file_search tool is still sent (vector_store_ids needed), but no files to upload
      const callArg = mockExportCode.mock.calls[0][0];
      expect(callArg.files).toBeUndefined();
      expect(callArg.tools).toEqual([{ type: 'file_search', vector_store_ids: ['vs-1'] }]);
    });
  });

  it('includes asr_model in request when ASR is enabled and model is selected', async () => {
    setupMockStore({ isAsrModelEnabled: true, selectedAsrModel: 'whisper-large-v3-turbo' });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          asr_model: 'whisper-large-v3-turbo',
        }),
      );
    });
  });

  it('does not include asr_model when ASR is disabled', async () => {
    setupMockStore({ isAsrModelEnabled: false, selectedAsrModel: 'whisper-large-v3-turbo' });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
    });

    const callArg = mockExportCode.mock.calls[0][0];
    expect(callArg.asr_model).toBeUndefined();
  });

  it('does not include asr_model when ASR is enabled but no model is selected', async () => {
    setupMockStore({ isAsrModelEnabled: true, selectedAsrModel: '' });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
    });

    const callArg = mockExportCode.mock.calls[0][0];
    expect(callArg.asr_model).toBeUndefined();
  });

  it('includes vision_image in request when hasVisionImage is true', async () => {
    setupMockStore({ hasVisionImage: true });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          vision_image: true,
        }),
      );
    });
  });

  it('does not include vision_image when hasVisionImage is false', async () => {
    setupMockStore({ hasVisionImage: false });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
      const callArg = mockExportCode.mock.calls[0][0];
      expect(callArg.vision_image).toBeUndefined();
    });
  });

  // --- MLflow Prompt Tests ---

  it('includes prompt config when activePrompt is set', async () => {
    setupMockStore({
      activePrompt: {
        name: 'ocp-troubleshoot',
        version: 2,
        template: 'You are a {{role}} assistant.',
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: { name: 'ocp-troubleshoot', version: 2 },
        }),
      );
    });
  });

  it('does not include prompt config when activePrompt is null', async () => {
    setupMockStore({ activePrompt: null });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
      const callArg = mockExportCode.mock.calls[0][0];
      expect(callArg.prompt).toBeUndefined();
    });
  });

  // --- External Vector Store Tests ---

  it('includes vector_store with id and embedding_model in external mode', async () => {
    const externalVectorStore = {
      ...mockVectorStore,
      metadata: { provider_id: 'milvus-provider', embedding_model: 'granite-embedding' },
    };
    mockUseFetchVectorStores.mockReturnValue([[externalVectorStore], true, undefined, jest.fn()]);
    setupMockStore({
      isRagEnabled: true,
      knowledgeMode: 'external',
      selectedVectorStoreId: 'vs-1',
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          vector_store: expect.objectContaining({
            name: 'test-vector-store',
            provider_id: 'milvus-provider',
            id: 'vs-1',
            embedding_model: 'granite-embedding',
          }),
        }),
      );
    });
  });

  it('does not include files in external mode', async () => {
    setupMockStore({
      isRagEnabled: true,
      knowledgeMode: 'external',
      selectedVectorStoreId: 'vs-1',
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
      const callArg = mockExportCode.mock.calls[0][0];
      expect(callArg.files).toBeUndefined();
    });
  });

  it('shows error when no vector store is selected in RAG mode', async () => {
    setupMockStore({
      isRagEnabled: true,
      knowledgeMode: 'external',
      selectedVectorStoreId: null,
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Error exporting code')).toBeInTheDocument();
      expect(screen.getByText('No vector store selected')).toBeInTheDocument();
    });
  });

  // --- Guardrails Tests ---

  it('includes guardrail_config with input prompt when input guardrail enabled', async () => {
    setupMockStore({
      guardrail: 'endpoint-3/gpt-4o-mini',
      guardrailUserInputEnabled: true,
      guardrailModelOutputEnabled: false,
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          guardrail_config: expect.objectContaining({
            guardrail_model: 'endpoint-3/gpt-4o-mini',
            input_prompt: expect.stringContaining('security guardrail analyzer'),
          }),
        }),
      );
      const callArg = mockExportCode.mock.calls[0][0];
      expect(callArg.guardrail_config.output_prompt).toBeUndefined();
    });
  });

  it('includes guardrail_config with both prompts when both enabled', async () => {
    setupMockStore({
      guardrail: 'endpoint-3/gpt-4o-mini',
      guardrailUserInputEnabled: true,
      guardrailModelOutputEnabled: true,
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalledWith(
        expect.objectContaining({
          guardrail_config: expect.objectContaining({
            guardrail_model: 'endpoint-3/gpt-4o-mini',
            input_prompt: expect.stringContaining('security guardrail analyzer'),
            output_prompt: expect.stringContaining('compliance guardrail analyzer'),
          }),
        }),
      );
    });
  });

  it('does not include guardrail_config when guardrail model is empty', async () => {
    setupMockStore({
      guardrail: '',
      guardrailUserInputEnabled: true,
      guardrailModelOutputEnabled: true,
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
      const callArg = mockExportCode.mock.calls[0][0];
      expect(callArg.guardrail_config).toBeUndefined();
    });
  });

  it('does not include guardrail_config when both checks are disabled', async () => {
    setupMockStore({
      guardrail: 'endpoint-3/gpt-4o-mini',
      guardrailUserInputEnabled: false,
      guardrailModelOutputEnabled: false,
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(mockExportCode).toHaveBeenCalled();
      const callArg = mockExportCode.mock.calls[0][0];
      expect(callArg.guardrail_config).toBeUndefined();
    });
  });
});
