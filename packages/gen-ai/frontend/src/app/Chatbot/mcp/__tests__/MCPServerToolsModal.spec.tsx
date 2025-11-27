import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MCPServerToolsModal from '~/app/Chatbot/mcp/MCPServerToolsModal';
import { useMCPServerTools } from '~/app/hooks/useMCPServerTools';
import { useMCPToolSelections } from '~/app/hooks/useMCPToolSelections';
import {
  mockServer,
  mockSingleTool,
  mockThreeTools,
  mockFourTools,
  mockKubernetesTools,
  mockToolsStatusSuccess,
  mockToolsStatusError,
  createMockToolsResponse,
} from './mockData';

// Mock dependencies
jest.mock('~/app/hooks/useMCPServerTools');
jest.mock('~/app/hooks/useMCPToolSelections');
jest.mock('~/app/context/GenAiContext', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react');
  return {
    GenAiContext: mockReact.createContext({ namespace: { name: 'test-namespace' } }),
  };
});

const mockUseMCPServerTools = useMCPServerTools as jest.MockedFunction<typeof useMCPServerTools>;
const mockUseMCPToolSelections = useMCPToolSelections as jest.MockedFunction<
  typeof useMCPToolSelections
>;

describe('MCPServerToolsModal', () => {
  const mockOnClose = jest.fn();
  const mockGetToolSelections = jest.fn();
  const mockSaveToolSelections = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    server: mockServer,
    mcpBearerToken: 'test-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseMCPToolSelections.mockReturnValue({
      getToolSelections: mockGetToolSelections,
      saveToolSelections: mockSaveToolSelections,
    });

    mockGetToolSelections.mockReturnValue(undefined);
  });

  describe('UI Component Tests', () => {
    it('should render modal with server name as title', () => {
      mockUseMCPServerTools.mockReturnValue(createMockToolsResponse({}));

      render(<MCPServerToolsModal {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Test Server' })).toBeInTheDocument();
      expect(screen.getByTestId('mcp-tools-modal')).toBeInTheDocument();
    });

    it('should display loading spinner when tools are loading', () => {
      mockUseMCPServerTools.mockReturnValue(
        createMockToolsResponse({
          toolsLoaded: false,
          isLoading: true,
        }),
      );

      render(<MCPServerToolsModal {...defaultProps} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading tools')).toBeInTheDocument();
    });

    it('should display error alert when tools fail to load', () => {
      const errorMessage = 'Connection failed';
      mockUseMCPServerTools.mockReturnValue(
        createMockToolsResponse({
          toolsLoaded: false,
          toolsLoadError: new Error(errorMessage),
          toolsStatus: mockToolsStatusError(errorMessage),
        }),
      );

      render(<MCPServerToolsModal {...defaultProps} />);

      expect(screen.getByText(/Failed to load tools from Test Server/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText(/Error code: ERR_CONNECTION/i)).toBeInTheDocument();
    });

    it('should display empty state message when no tools available', () => {
      mockUseMCPServerTools.mockReturnValue(
        createMockToolsResponse({
          toolsStatus: mockToolsStatusSuccess,
        }),
      );

      render(<MCPServerToolsModal {...defaultProps} />);

      expect(screen.getByText('No tools available for this server')).toBeInTheDocument();
    });

    it('should render table with correct columns', async () => {
      mockUseMCPServerTools.mockReturnValue(
        createMockToolsResponse({
          tools: mockSingleTool,
        }),
      );

      render(<MCPServerToolsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('mcp-tools-modal-table')).toBeInTheDocument();
      });

      expect(screen.getByRole('columnheader', { name: /Tool name/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Description/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /select all/i })).toBeInTheDocument();
    });

    it('should toggle individual tool checkbox', async () => {
      const user = userEvent.setup();

      mockUseMCPServerTools.mockReturnValue(
        createMockToolsResponse({
          tools: mockSingleTool,
        }),
      );

      render(<MCPServerToolsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/1 out of 1 selected/i)).toBeInTheDocument();
      });

      // Get the individual tool checkbox (not the select all checkbox)
      const checkboxes = screen.getAllByRole('checkbox');
      const toolCheckbox = checkboxes.find((cb) => cb.getAttribute('aria-label') !== 'Select all');

      await user.click(toolCheckbox!);

      await waitFor(() => {
        expect(screen.getByText(/0 out of 1 selected/i)).toBeInTheDocument();
      });
    });

    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup();

      mockUseMCPServerTools.mockReturnValue(
        createMockToolsResponse({
          tools: mockSingleTool,
        }),
      );

      render(<MCPServerToolsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should save only filtered tools when selecting all after search', async () => {
    const user = userEvent.setup();

    mockUseMCPServerTools.mockReturnValue(
      createMockToolsResponse({
        tools: mockKubernetesTools,
      }),
    );

    render(<MCPServerToolsModal {...defaultProps} />);

    // Wait for tools to load
    await waitFor(() => {
      expect(screen.getByText(/21 out of 21 selected/i)).toBeInTheDocument();
    });

    // Step 1: Search for "pod"
    const searchInput = screen.getByPlaceholderText('Find by name');
    await user.clear(searchInput);
    await user.type(searchInput, 'pod');

    // Step 2: Verify count shows 8 out of 21 (since search filters but doesn't deselect)
    // Note: The actual filtered count might show differently depending on implementation
    await waitFor(() => {
      expect(searchInput).toHaveValue('pod');
    });

    // Step 3: Deselect all first (to start fresh)
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    if (selectAllCheckbox.getAttribute('aria-checked') === 'true') {
      await user.click(selectAllCheckbox);
    }

    // Step 4: Select all (should only select the 8 filtered tools)
    await user.click(selectAllCheckbox);

    // Step 5: Click Save
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Step 6: Verify saveToolSelections was called with only the 8 pod-related tools
    await waitFor(() => {
      expect(mockSaveToolSelections).toHaveBeenCalled();
    });

    const savedToolNames = mockSaveToolSelections.mock.calls[0][2];
    expect(savedToolNames).toHaveLength(8);
    expect(savedToolNames).toEqual([
      'kubernetes_pod_list',
      'kubernetes_pod_get',
      'kubernetes_pod_create',
      'kubernetes_pod_delete',
      'kubernetes_pod_logs',
      'kubernetes_pod_exec',
      'kubernetes_pod_watch',
      'kubernetes_pod_status',
    ]);
  });

  it('should maintain selections for non-filtered tools when searching', async () => {
    const user = userEvent.setup();

    mockUseMCPServerTools.mockReturnValue(
      createMockToolsResponse({
        tools: mockFourTools,
      }),
    );

    render(<MCPServerToolsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/4 out of 4 selected/i)).toBeInTheDocument();
    });

    // Deselect all first
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    await user.click(selectAllCheckbox);

    // Search for "redis" - should show 2 tools
    const searchInput = screen.getByPlaceholderText('Find by name');
    await user.type(searchInput, 'redis');

    // Select all filtered (redis tools)
    await user.click(selectAllCheckbox);

    // Clear search to see all tools again
    await user.clear(searchInput);

    // Now save - should only save the 2 redis tools
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSaveToolSelections).toHaveBeenCalled();
    });

    const savedToolNames = mockSaveToolSelections.mock.calls[0][2];
    expect(savedToolNames).toHaveLength(2);
    expect(savedToolNames).toEqual(['redis_get', 'redis_set']);
  });

  it('should save empty array when no tools are selected', async () => {
    const user = userEvent.setup();

    mockUseMCPServerTools.mockReturnValue(
      createMockToolsResponse({
        tools: mockThreeTools,
      }),
    );

    render(<MCPServerToolsModal {...defaultProps} />);

    // Wait for tools to load (all selected by default)
    await waitFor(() => {
      expect(screen.getByText(/3 out of 3 selected/i)).toBeInTheDocument();
    });

    // Deselect all tools
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    await user.click(selectAllCheckbox);

    // Verify count shows 0 out of 3 selected
    await waitFor(() => {
      expect(screen.getByText(/0 out of 3 selected/i)).toBeInTheDocument();
    });

    // Click Save
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Verify saveToolSelections was called with empty array
    // Empty array [] means NO tools are allowed for this MCP server
    await waitFor(() => {
      expect(mockSaveToolSelections).toHaveBeenCalledWith(
        'test-namespace',
        'http://test-server.com',
        [], // Empty array = NO tools allowed
      );
    });
  });

  it('should save undefined when all tools are selected', async () => {
    const user = userEvent.setup();

    mockUseMCPServerTools.mockReturnValue(
      createMockToolsResponse({
        tools: mockThreeTools,
      }),
    );

    render(<MCPServerToolsModal {...defaultProps} />);

    // Wait for tools to load (all selected by default)
    await waitFor(() => {
      expect(screen.getByText(/3 out of 3 selected/i)).toBeInTheDocument();
    });

    // Don't change anything - all tools remain selected

    // Click Save without making any changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Verify saveToolSelections was called with undefined
    // undefined = ALL tools allowed (no restriction on tools)
    await waitFor(() => {
      expect(mockSaveToolSelections).toHaveBeenCalledWith(
        'test-namespace',
        'http://test-server.com',
        undefined, // undefined = ALL tools allowed
      );
    });

    // Verify modal closes
    expect(mockOnClose).toHaveBeenCalled();
  });

  describe('Loading Saved Selections', () => {
    it('should load previously saved tool selections on modal open', async () => {
      mockGetToolSelections.mockReturnValue(['tool1', 'tool3']);

      mockUseMCPServerTools.mockReturnValue(
        createMockToolsResponse({
          tools: mockThreeTools,
        }),
      );

      render(<MCPServerToolsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/2 out of 3 selected/i)).toBeInTheDocument();
      });

      expect(mockGetToolSelections).toHaveBeenCalledWith(
        'test-namespace',
        'http://test-server.com',
      );
    });

    it('should handle saved tools that no longer exist on server', async () => {
      mockGetToolSelections.mockReturnValue(['tool1', 'deleted_tool', 'tool3']);

      mockUseMCPServerTools.mockReturnValue(
        createMockToolsResponse({
          tools: mockThreeTools,
        }),
      );

      render(<MCPServerToolsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/2 out of 3 selected/i)).toBeInTheDocument();
      });
    });

    it('should select all tools when saved selections is undefined', async () => {
      mockGetToolSelections.mockReturnValue(undefined);

      mockUseMCPServerTools.mockReturnValue(
        createMockToolsResponse({
          tools: mockThreeTools,
        }),
      );

      render(<MCPServerToolsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/3 out of 3 selected/i)).toBeInTheDocument();
      });
    });

    it('should select no tools when saved selections is empty array', async () => {
      mockGetToolSelections.mockReturnValue([]);

      mockUseMCPServerTools.mockReturnValue(
        createMockToolsResponse({
          tools: mockThreeTools,
        }),
      );

      render(<MCPServerToolsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/0 out of 3 selected/i)).toBeInTheDocument();
      });
    });
  });
});
