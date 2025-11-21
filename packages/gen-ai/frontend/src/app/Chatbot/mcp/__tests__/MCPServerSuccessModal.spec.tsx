import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MCPServerSuccessModal from '~/app/Chatbot/mcp/MCPServerSuccessModal';
import { mockServer } from './mockData';

describe('MCPServerSuccessModal', () => {
  const mockOnClose = jest.fn();
  const mockOnEditTools = jest.fn();
  const mockOnDisconnect = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    server: mockServer,
    onEditTools: mockOnEditTools,
    onDisconnect: mockOnDisconnect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display Count Logic', () => {
    it('should show "0 out of 0" when both counts are 0', () => {
      render(
        <MCPServerSuccessModal {...defaultProps} selectedToolsCount={0} totalToolsCount={0} />,
      );

      expect(screen.getByText('0 out of 0 tools are active.')).toBeInTheDocument();
    });

    it('should show "0 out of 0" when loading (totalToolsCount=0, selectedToolsCount>0)', () => {
      render(
        <MCPServerSuccessModal {...defaultProps} selectedToolsCount={2} totalToolsCount={0} />,
      );

      expect(screen.getByText('0 out of 0 tools are active.')).toBeInTheDocument();
      expect(screen.queryByText('2 out of 0 tools are active.')).not.toBeInTheDocument();
    });

    it('should show correct counts when tools loaded', () => {
      render(
        <MCPServerSuccessModal {...defaultProps} selectedToolsCount={5} totalToolsCount={10} />,
      );

      expect(screen.getByText('5 out of 10 tools are active.')).toBeInTheDocument();
    });

    it('should show performance warning when selectedToolsCount > 40', () => {
      render(
        <MCPServerSuccessModal {...defaultProps} selectedToolsCount={45} totalToolsCount={50} />,
      );

      expect(screen.getByText('45 out of 50 tools are active.')).toBeInTheDocument();
      expect(
        screen.getByText('Performance may be degraded with more than 40 active tools.'),
      ).toBeInTheDocument();
    });

    it('should NOT show performance warning during loading even if selectedToolsCount > 40', () => {
      render(
        <MCPServerSuccessModal {...defaultProps} selectedToolsCount={45} totalToolsCount={0} />,
      );

      expect(screen.getByText('0 out of 0 tools are active.')).toBeInTheDocument();
      expect(
        screen.queryByText('Performance may be degraded with more than 40 active tools.'),
      ).not.toBeInTheDocument();
    });
  });

  describe('UI Component Tests', () => {
    it('should render modal with success title and server name', () => {
      render(
        <MCPServerSuccessModal {...defaultProps} selectedToolsCount={5} totalToolsCount={10} />,
      );

      expect(screen.getByTestId('mcp-server-success-modal')).toBeInTheDocument();
      expect(screen.getByText('Connection successful')).toBeInTheDocument();
      expect(screen.getByText(/You are now connected to/)).toBeInTheDocument();
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });

    it('should call onClose when Save button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MCPServerSuccessModal {...defaultProps} selectedToolsCount={5} totalToolsCount={10} />,
      );

      const saveButton = screen.getByTestId('modal-submit-button');
      await user.click(saveButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onDisconnect when Disconnect button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MCPServerSuccessModal {...defaultProps} selectedToolsCount={5} totalToolsCount={10} />,
      );

      const disconnectButton = screen.getByTestId('modal-cancel-button');
      await user.click(disconnectButton);

      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should call onEditTools when Edit tool selection button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <MCPServerSuccessModal {...defaultProps} selectedToolsCount={5} totalToolsCount={10} />,
      );

      const editButton = screen.getByRole('button', { name: /Edit tool selection/i });
      await user.click(editButton);

      expect(mockOnEditTools).toHaveBeenCalledTimes(1);
    });
  });
});
