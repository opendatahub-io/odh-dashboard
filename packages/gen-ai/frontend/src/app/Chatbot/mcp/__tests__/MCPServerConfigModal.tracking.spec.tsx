import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import MCPServerConfigModal from '~/app/Chatbot/mcp/MCPServerConfigModal';
import { MCPServer } from '~/app/types';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('MCPServerConfigModal - Tracking', () => {
  const mockServer: MCPServer = {
    id: 'test-server-1',
    name: 'Test MCP Server',
    connectionUrl: 'https://test.mcp.server',
    description: 'Test server description',
    status: 'active',
    endpoint: 'https://test.mcp.server',
    tools: 5,
    version: '1.0.0',
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    server: mockServer,
    currentToken: '',
    onTokenSave: jest.fn().mockResolvedValue({ success: true }),
    isValidating: false,
    validationError: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MCP Token Cleared Tracking', () => {
    it('should fire tracking event when token is cleared', async () => {
      const user = userEvent.setup();
      render(
        <MCPServerConfigModal
          {...defaultProps}
          currentToken="existing-token"
          validationError="Invalid token"
        />,
      );

      const clearButton = screen.getByTestId('mcp-token-clear-button');
      await user.click(clearButton);

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground MCP Token Cleared', {
        mcpServerName: 'Test MCP Server',
      });
    });

    it('should clear the token input after clearing', async () => {
      const user = userEvent.setup();
      render(
        <MCPServerConfigModal
          {...defaultProps}
          currentToken="existing-token"
          validationError="Invalid token"
        />,
      );

      const tokenInput = screen.getByTestId('mcp-token-input') as HTMLInputElement;
      expect(tokenInput.value).toBe('existing-token');

      const clearButton = screen.getByTestId('mcp-token-clear-button');
      await user.click(clearButton);

      expect(tokenInput.value).toBe('');
    });
  });

  describe('MCP Configuration Modal Canceled Tracking', () => {
    it('should fire tracking event when modal is canceled', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(<MCPServerConfigModal {...defaultProps} onClose={mockOnClose} />);

      const cancelButton = screen.getByTestId('mcp-token-cancel-button');
      await user.click(cancelButton);

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground MCP Configuration Modal Canceled',
        {
          mcpServerName: 'Test MCP Server',
        },
      );
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not fire tracking when authorize button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnTokenSave = jest.fn().mockResolvedValue({ success: true });

      render(
        <MCPServerConfigModal
          {...defaultProps}
          currentToken="test-token"
          onTokenSave={mockOnTokenSave}
        />,
      );

      const authorizeButton = screen.getByTestId('mcp-token-authorize-button');
      await user.click(authorizeButton);

      expect(mockFireMiscTrackingEvent).not.toHaveBeenCalledWith(
        'Playground MCP Configuration Modal Canceled',
        expect.any(Object),
      );
    });
  });

  describe('Integration', () => {
    it('should fire both clear and cancel tracking events independently', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <MCPServerConfigModal
          {...defaultProps}
          currentToken="existing-token"
          onClose={mockOnClose}
          validationError="Invalid token"
        />,
      );

      // Clear the token
      const clearButton = screen.getByTestId('mcp-token-clear-button');
      await user.click(clearButton);

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground MCP Token Cleared', {
        mcpServerName: 'Test MCP Server',
      });

      // Cancel the modal
      const cancelButton = screen.getByTestId('mcp-token-cancel-button');
      await user.click(cancelButton);

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground MCP Configuration Modal Canceled',
        {
          mcpServerName: 'Test MCP Server',
        },
      );

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledTimes(2);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
