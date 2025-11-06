/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ViewCodeModal from '~/app/Chatbot/components/ViewCodeModal';
import { GenAiContext } from '~/app/context/GenAiContext';
import { useMCPServers } from '~/app/hooks/useMCPServers';
import { useMCPTokenContext } from '~/app/context/MCPTokenContext';
import { useMCPSelectionContext } from '~/app/context/MCPSelectionContext';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { FileModel } from '~/app/types';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('~/app/hooks/useMCPServers');
jest.mock('~/app/context/MCPTokenContext');
jest.mock('~/app/context/MCPSelectionContext');
jest.mock('~/app/hooks/useFetchVectorStores');
jest.mock('~/app/hooks/useGenAiAPI');

const mockUseMCPServers = jest.mocked(useMCPServers);
const mockUseMCPTokenContext = jest.mocked(useMCPTokenContext);
const mockUseMCPSelectionContext = jest.mocked(useMCPSelectionContext);
const mockUseFetchVectorStores = jest.mocked(useFetchVectorStores);
const mockUseGenAiAPI = useGenAiAPI as jest.Mock;
const mockExportCode = jest.fn();

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
    model: 'test-model',
    systemInstruction: 'You are a helpful assistant.',
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

    mockUseMCPServers.mockReturnValue({
      servers: [],
      serversLoaded: true,
      serversLoadError: null,
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      allStatusesChecked: true,
      refresh: jest.fn(),
      checkServerStatus: jest.fn(),
    });

    mockUseMCPTokenContext.mockReturnValue({
      serverTokens: new Map(),
      setServerTokens: jest.fn(),
      isServerValidated: jest.fn(),
    });

    mockUseMCPSelectionContext.mockReturnValue({
      playgroundSelectedServerIds: [],
      saveSelectedServersToPlayground: jest.fn(),
      selectedServersCount: 0,
      setSelectedServersCount: jest.fn(),
    });

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

    mockUseMCPServers.mockReturnValue({
      servers: [mockServer],
      serversLoaded: true,
      serversLoadError: null,
      serverStatuses: new Map(),
      statusesLoading: new Set(),
      allStatusesChecked: true,
      refresh: jest.fn(),
      checkServerStatus: jest.fn(),
    });

    mockUseMCPSelectionContext.mockReturnValue({
      playgroundSelectedServerIds: ['http://test-server'],
      saveSelectedServersToPlayground: jest.fn(),
      selectedServersCount: 1,
      setSelectedServersCount: jest.fn(),
    });

    render(
      <TestWrapper>
        <ViewCodeModal {...defaultProps} />
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
});
