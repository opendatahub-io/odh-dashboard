import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotPane from '~/app/Chatbot/ChatbotPane';

jest.mock('~/app/Chatbot/components/ChatbotPaneHeader', () => ({
  __esModule: true,
  default: ({
    label,
    onCloseClick,
    testIdPrefix,
  }: {
    label: string;
    onCloseClick: () => void;
    testIdPrefix: string;
  }) => (
    <div data-testid="mock-pane-header">
      <span data-testid="header-label">{label}</span>
      <button data-testid={`${testIdPrefix}-close-button`} onClick={onCloseClick} type="button">
        Close
      </button>
    </div>
  ),
}));

describe('ChatbotPane', () => {
  const defaultProps = {
    configId: 'test-config-1',
    displayLabel: 'Chat 1',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with the correct test id based on configId', () => {
    render(
      <ChatbotPane {...defaultProps}>
        <div>Child content</div>
      </ChatbotPane>,
    );

    expect(screen.getByTestId('chatbot-pane-test-config-1')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <ChatbotPane {...defaultProps}>
        <div data-testid="child-content">Child content</div>
      </ChatbotPane>,
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('passes displayLabel to header', () => {
    render(
      <ChatbotPane {...defaultProps}>
        <div>Child content</div>
      </ChatbotPane>,
    );

    expect(screen.getByTestId('header-label')).toHaveTextContent('Chat 1');
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    render(
      <ChatbotPane {...defaultProps} onClose={mockOnClose}>
        <div>Child content</div>
      </ChatbotPane>,
    );

    await user.click(screen.getByTestId('chatbot-pane-test-config-1-close-button'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-label for accessibility', () => {
    render(
      <ChatbotPane {...defaultProps} displayLabel="Chat 2">
        <div>Child content</div>
      </ChatbotPane>,
    );

    const pane = screen.getByTestId('chatbot-pane-test-config-1');
    expect(pane).toHaveAttribute('aria-label', 'Chat 2');
  });

  it('has region role for accessibility', () => {
    render(
      <ChatbotPane {...defaultProps}>
        <div>Child content</div>
      </ChatbotPane>,
    );

    const pane = screen.getByTestId('chatbot-pane-test-config-1');
    expect(pane).toHaveAttribute('role', 'region');
  });

  it('uses configId for testIdPrefix in header', () => {
    render(
      <ChatbotPane {...defaultProps} configId="custom-config" onClose={jest.fn()}>
        <div>Child content</div>
      </ChatbotPane>,
    );

    expect(screen.getByTestId('chatbot-pane-custom-config-close-button')).toBeInTheDocument();
  });
});
