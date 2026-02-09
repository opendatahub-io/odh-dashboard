import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotPane from '~/app/Chatbot/ChatbotPane';

// Mock ChatbotPaneHeader
jest.mock('~/app/Chatbot/components/ChatbotPaneHeader', () => ({
  __esModule: true,
  default: ({
    label,
    selectedModel,
    onModelChange,
    onSettingsClick,
    onCloseClick,
    testIdPrefix,
  }: {
    label: string;
    selectedModel: string;
    onModelChange: (model: string) => void;
    onSettingsClick: () => void;
    onCloseClick: () => void;
    hasDivider: boolean;
    testIdPrefix: string;
  }) => (
    <div data-testid="mock-pane-header">
      <span data-testid="header-label">{label}</span>
      <span data-testid="header-model">{selectedModel}</span>
      <button
        data-testid={`${testIdPrefix}-settings-button`}
        onClick={onSettingsClick}
        type="button"
      >
        Settings
      </button>
      <button data-testid={`${testIdPrefix}-close-button`} onClick={onCloseClick} type="button">
        Close
      </button>
      <button data-testid="change-model" onClick={() => onModelChange('new-model')} type="button">
        Change Model
      </button>
    </div>
  ),
}));

describe('ChatbotPane', () => {
  const defaultProps = {
    configId: 'test-config-1',
    displayLabel: 'Model 1',
    selectedModel: 'test-model',
    onModelChange: jest.fn(),
    onSettingsClick: jest.fn(),
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

    expect(screen.getByTestId('header-label')).toHaveTextContent('Model 1');
  });

  it('passes selectedModel to header', () => {
    render(
      <ChatbotPane {...defaultProps}>
        <div>Child content</div>
      </ChatbotPane>,
    );

    expect(screen.getByTestId('header-model')).toHaveTextContent('test-model');
  });

  it('calls onSettingsClick when settings button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnSettingsClick = jest.fn();
    render(
      <ChatbotPane {...defaultProps} onSettingsClick={mockOnSettingsClick}>
        <div>Child content</div>
      </ChatbotPane>,
    );

    await user.click(screen.getByTestId('chatbot-pane-test-config-1-settings-button'));

    expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
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

  it('calls onModelChange when model is changed', async () => {
    const user = userEvent.setup();
    const mockOnModelChange = jest.fn();
    render(
      <ChatbotPane {...defaultProps} onModelChange={mockOnModelChange}>
        <div>Child content</div>
      </ChatbotPane>,
    );

    await user.click(screen.getByTestId('change-model'));

    expect(mockOnModelChange).toHaveBeenCalledWith('new-model');
  });

  it('has correct aria-label for accessibility', () => {
    render(
      <ChatbotPane {...defaultProps} displayLabel="Model 2">
        <div>Child content</div>
      </ChatbotPane>,
    );

    const pane = screen.getByTestId('chatbot-pane-test-config-1');
    expect(pane).toHaveAttribute('aria-label', 'Model 2');
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
      <ChatbotPane {...defaultProps} configId="custom-config">
        <div>Child content</div>
      </ChatbotPane>,
    );

    expect(screen.getByTestId('chatbot-pane-custom-config-settings-button')).toBeInTheDocument();
    expect(screen.getByTestId('chatbot-pane-custom-config-close-button')).toBeInTheDocument();
  });

  it('renders different configIds correctly', () => {
    const { rerender } = render(
      <ChatbotPane {...defaultProps} configId="config-1" displayLabel="Model 1">
        <div>Content 1</div>
      </ChatbotPane>,
    );

    expect(screen.getByTestId('chatbot-pane-config-1')).toBeInTheDocument();
    expect(screen.getByTestId('header-label')).toHaveTextContent('Model 1');

    rerender(
      <ChatbotPane {...defaultProps} configId="config-2" displayLabel="Model 2">
        <div>Content 2</div>
      </ChatbotPane>,
    );

    expect(screen.getByTestId('chatbot-pane-config-2')).toBeInTheDocument();
    expect(screen.getByTestId('header-label')).toHaveTextContent('Model 2');
  });
});
