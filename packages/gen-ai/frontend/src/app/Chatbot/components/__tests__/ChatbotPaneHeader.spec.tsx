import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotPaneHeader from '~/app/Chatbot/components/ChatbotPaneHeader';

// Mock @patternfly/chatbot to avoid Jest parsing issues
jest.mock('@patternfly/chatbot', () => ({
  ChatbotHeaderMain: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-chatbot-header-main">{children}</div>
  ),
}));

// Mock ModelDetailsDropdown
jest.mock('~/app/Chatbot/components/ModelDetailsDropdown', () => ({
  __esModule: true,
  default: ({
    selectedModel,
    onModelChange,
  }: {
    selectedModel: string;
    onModelChange: (model: string) => void;
  }) => (
    <button
      data-testid="mock-model-dropdown"
      onClick={() => onModelChange('new-model')}
      type="button"
    >
      {selectedModel || 'Select a model'}
    </button>
  ),
}));

describe('ChatbotPaneHeader', () => {
  const defaultProps = {
    selectedModel: 'test-model',
    onModelChange: jest.fn(),
    onSettingsClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the model dropdown with selected model', () => {
    render(<ChatbotPaneHeader {...defaultProps} />);

    expect(screen.getByTestId('mock-model-dropdown')).toHaveTextContent('test-model');
  });

  it('renders settings button', () => {
    render(<ChatbotPaneHeader {...defaultProps} />);

    const settingsButton = screen.getByRole('button', { name: /open settings panel/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it('calls onSettingsClick when settings button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnSettingsClick = jest.fn();
    render(<ChatbotPaneHeader {...defaultProps} onSettingsClick={mockOnSettingsClick} />);

    const settingsButton = screen.getByRole('button', { name: /open settings panel/i });
    await user.click(settingsButton);

    expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
  });

  it('renders label when provided', () => {
    render(<ChatbotPaneHeader {...defaultProps} label="Model 1" />);

    expect(screen.getByText('Model 1')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    render(<ChatbotPaneHeader {...defaultProps} />);

    expect(screen.queryByText('Model 1')).not.toBeInTheDocument();
  });

  it('renders close button when onCloseClick is provided', () => {
    render(<ChatbotPaneHeader {...defaultProps} onCloseClick={jest.fn()} />);

    const closeButton = screen.getByRole('button', { name: /close pane/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('does not render close button when onCloseClick is not provided', () => {
    render(<ChatbotPaneHeader {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /close pane/i })).not.toBeInTheDocument();
  });

  it('calls onCloseClick when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotPaneHeader {...defaultProps} onCloseClick={mockOnCloseClick} />);

    const closeButton = screen.getByRole('button', { name: /close pane/i });
    await user.click(closeButton);

    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);
  });

  it('renders divider when hasDivider is true', () => {
    const { container } = render(<ChatbotPaneHeader {...defaultProps} hasDivider />);

    // PatternFly Divider uses hr element
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('does not render divider when hasDivider is false', () => {
    const { container } = render(<ChatbotPaneHeader {...defaultProps} hasDivider={false} />);

    expect(container.querySelector('hr')).not.toBeInTheDocument();
  });

  it('uses custom testIdPrefix for settings button', () => {
    render(<ChatbotPaneHeader {...defaultProps} testIdPrefix="compare-pane" />);

    expect(screen.getByTestId('compare-pane-settings-button')).toBeInTheDocument();
  });

  it('uses custom testIdPrefix for close button', () => {
    render(
      <ChatbotPaneHeader {...defaultProps} testIdPrefix="compare-pane" onCloseClick={jest.fn()} />,
    );

    expect(screen.getByTestId('compare-pane-close-button')).toBeInTheDocument();
  });

  it('calls onModelChange when model is changed in dropdown', async () => {
    const user = userEvent.setup();
    const mockOnModelChange = jest.fn();
    render(<ChatbotPaneHeader {...defaultProps} onModelChange={mockOnModelChange} />);

    const dropdown = screen.getByTestId('mock-model-dropdown');
    await user.click(dropdown);

    expect(mockOnModelChange).toHaveBeenCalledWith('new-model');
  });

  it('stops event propagation when settings button is clicked', async () => {
    const user = userEvent.setup();
    const mockContainerClick = jest.fn();
    const mockOnSettingsClick = jest.fn();

    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={mockContainerClick}>
        <ChatbotPaneHeader {...defaultProps} onSettingsClick={mockOnSettingsClick} />
      </div>,
    );

    const settingsButton = screen.getByRole('button', { name: /open settings panel/i });
    await user.click(settingsButton);

    expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
    // The container click should not be triggered due to stopPropagation
    expect(mockContainerClick).not.toHaveBeenCalled();
  });

  it('stops event propagation when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockContainerClick = jest.fn();
    const mockOnCloseClick = jest.fn();

    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={mockContainerClick}>
        <ChatbotPaneHeader {...defaultProps} onCloseClick={mockOnCloseClick} />
      </div>,
    );

    const closeButton = screen.getByRole('button', { name: /close pane/i });
    await user.click(closeButton);

    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);
    // The container click should not be triggered due to stopPropagation
    expect(mockContainerClick).not.toHaveBeenCalled();
  });
});
