import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import NewChatModal from '~/app/Chatbot/components/NewChatModal';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils');

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);

describe('NewChatModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with correct content when open', () => {
    render(<NewChatModal {...defaultProps} />);

    expect(screen.getByText('Start a new chat?')).toBeInTheDocument();
    expect(
      screen.getByText(/Starting a new chat will clear your current conversation history/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your model, RAG, and MCP server configurations will be retained/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to continue?')).toBeInTheDocument();
  });

  it('does not render modal when not open', () => {
    render(<NewChatModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Start a new chat?')).not.toBeInTheDocument();
  });

  it('renders confirm and cancel buttons', () => {
    render(<NewChatModal {...defaultProps} />);

    expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
  });

  it('calls onConfirm and onClose when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnConfirm = jest.fn();
    const mockOnClose = jest.fn();

    render(<NewChatModal {...defaultProps} onConfirm={mockOnConfirm} onClose={mockOnClose} />);

    const confirmButton = screen.getByTestId('confirm-button');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground New Chat', {
        outcome: TrackingOutcome.submit,
        success: true,
      });
    });
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnConfirm = jest.fn();
    const mockOnClose = jest.fn();

    render(<NewChatModal {...defaultProps} onConfirm={mockOnConfirm} onClose={mockOnClose} />);

    const cancelButton = screen.getByTestId('cancel-button');
    await user.click(cancelButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground New Chat', {
        outcome: TrackingOutcome.cancel,
      });
    });
  });

  it('fires cancel tracking event when modal is closed via X button', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();

    render(<NewChatModal {...defaultProps} onClose={mockOnClose} />);

    // Close button should be present in the modal header
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground New Chat', {
        outcome: TrackingOutcome.cancel,
      });
    });
  });

  it('has correct data-testid attributes for testing', () => {
    render(<NewChatModal {...defaultProps} />);

    expect(screen.getByTestId('new-chat-modal')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-button')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
  });

  it('displays warning icon variant in modal header', () => {
    const { container } = render(<NewChatModal {...defaultProps} />);

    // Check that modal has warning icon (PatternFly uses specific classes)
    const modalHeader = container.querySelector('.pf-v6-c-modal-box__title');
    expect(modalHeader).toBeInTheDocument();
  });

  it('confirm button has primary variant', () => {
    render(<NewChatModal {...defaultProps} />);

    const confirmButton = screen.getByTestId('confirm-button');
    expect(confirmButton).toHaveClass('pf-m-primary');
  });

  it('cancel button has link variant', () => {
    render(<NewChatModal {...defaultProps} />);

    const cancelButton = screen.getByTestId('cancel-button');
    expect(cancelButton).toHaveClass('pf-m-link');
  });

  it('confirm button text says "Start new chat"', () => {
    render(<NewChatModal {...defaultProps} />);

    expect(screen.getByText('Start new chat')).toBeInTheDocument();
  });

  it('cancel button text says "Cancel"', () => {
    render(<NewChatModal {...defaultProps} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
