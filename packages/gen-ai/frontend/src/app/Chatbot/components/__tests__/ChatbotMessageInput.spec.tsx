import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotMessageInput from '~/app/Chatbot/components/ChatbotMessageInput';
import { ERROR_MESSAGES, FILE_UPLOAD_CONFIG } from '~/app/Chatbot/const';

// Mock the PatternFly chatbot components
jest.mock('@patternfly/chatbot', () => ({
  MessageBar: ({
    onSendMessage,
    handleStopButton,
    hasAttachButton,
    isSendButtonDisabled,
    hasStopButton,
    onAttachRejected,
    'data-testid': testId,
  }: {
    onSendMessage: (message: string) => void;
    handleStopButton: () => void;
    hasAttachButton: boolean;
    isSendButtonDisabled: boolean;
    hasStopButton: boolean;
    onAttachRejected: (rejections: unknown[]) => void;
    'data-testid': string;
  }) => (
    <div data-testid={testId}>
      <input
        data-testid="mock-message-input"
        onChange={(e) => onSendMessage(e.target.value)}
        disabled={isSendButtonDisabled}
      />
      <button
        data-testid="mock-send-button"
        onClick={() => onSendMessage('test message')}
        disabled={isSendButtonDisabled}
        type="button"
      >
        Send
      </button>
      {hasStopButton && (
        <button data-testid="mock-stop-button" onClick={handleStopButton} type="button">
          Stop
        </button>
      )}
      {hasAttachButton && (
        <button data-testid="mock-attach-button" type="button">
          Attach
        </button>
      )}
      <button
        data-testid="mock-reject-button"
        onClick={() =>
          onAttachRejected([
            {
              file: { name: 'test.exe' },
              errors: [{ code: 'file-invalid-type', message: 'Invalid type' }],
            },
          ])
        }
        type="button"
      >
        Trigger Reject
      </button>
    </div>
  ),
  ChatbotFootnote: ({ label }: { label: string }) => <div data-testid="mock-footnote">{label}</div>,
}));

describe('ChatbotMessageInput', () => {
  const defaultProps = {
    onSendMessage: jest.fn(),
    onStopStreaming: jest.fn(),
    isLoading: false,
    isSendDisabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the message bar', () => {
    render(<ChatbotMessageInput {...defaultProps} />);

    expect(screen.getByTestId('chatbot-message-bar')).toBeInTheDocument();
  });

  it('renders the footnote with AI warning', () => {
    render(<ChatbotMessageInput {...defaultProps} />);

    expect(screen.getByTestId('mock-footnote')).toHaveTextContent(
      'This chatbot uses AI. Check for mistakes.',
    );
  });

  it('calls onSendMessage when a message is sent', async () => {
    const user = userEvent.setup();
    const mockOnSendMessage = jest.fn();
    render(<ChatbotMessageInput {...defaultProps} onSendMessage={mockOnSendMessage} />);

    const sendButton = screen.getByTestId('mock-send-button');
    await user.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledWith('test message');
  });

  it('shows stop button when isLoading is true', () => {
    render(<ChatbotMessageInput {...defaultProps} isLoading />);

    expect(screen.getByTestId('mock-stop-button')).toBeInTheDocument();
  });

  it('does not show stop button when isLoading is false', () => {
    render(<ChatbotMessageInput {...defaultProps} isLoading={false} />);

    expect(screen.queryByTestId('mock-stop-button')).not.toBeInTheDocument();
  });

  it('calls onStopStreaming when stop button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnStopStreaming = jest.fn();
    render(
      <ChatbotMessageInput {...defaultProps} isLoading onStopStreaming={mockOnStopStreaming} />,
    );

    const stopButton = screen.getByTestId('mock-stop-button');
    await user.click(stopButton);

    expect(mockOnStopStreaming).toHaveBeenCalledTimes(1);
  });

  it('disables send button when isSendDisabled is true', () => {
    render(<ChatbotMessageInput {...defaultProps} isSendDisabled />);

    expect(screen.getByTestId('mock-send-button')).toBeDisabled();
  });

  it('enables send button when isSendDisabled is false', () => {
    render(<ChatbotMessageInput {...defaultProps} isSendDisabled={false} />);

    expect(screen.getByTestId('mock-send-button')).not.toBeDisabled();
  });

  it('shows attach button by default', () => {
    render(<ChatbotMessageInput {...defaultProps} />);

    expect(screen.getByTestId('mock-attach-button')).toBeInTheDocument();
  });

  it('hides attach button when showAttachButton is false', () => {
    render(<ChatbotMessageInput {...defaultProps} showAttachButton={false} />);

    expect(screen.queryByTestId('mock-attach-button')).not.toBeInTheDocument();
  });

  it('calls onShowErrorAlert with file rejection error message', async () => {
    const user = userEvent.setup();
    const mockOnShowErrorAlert = jest.fn();
    render(<ChatbotMessageInput {...defaultProps} onShowErrorAlert={mockOnShowErrorAlert} />);

    const rejectButton = screen.getByTestId('mock-reject-button');
    await user.click(rejectButton);

    expect(mockOnShowErrorAlert).toHaveBeenCalledWith(
      expect.stringContaining(ERROR_MESSAGES.FILE_UPLOAD_REJECTED),
      'File Upload Error',
    );
    expect(mockOnShowErrorAlert).toHaveBeenCalledWith(
      expect.stringContaining(FILE_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS),
      'File Upload Error',
    );
  });

  it('applies light mode styles when isDarkMode is false', () => {
    const { container } = render(<ChatbotMessageInput {...defaultProps} isDarkMode={false} />);

    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveStyle({
      backgroundColor: 'var(--pf-t--global--background--color--100)',
    });
  });

  it('applies dark mode styles when isDarkMode is true', () => {
    const { container } = render(<ChatbotMessageInput {...defaultProps} isDarkMode />);

    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveStyle({
      backgroundColor: 'var(--pf-t--global--dark--background--color--100)',
    });
  });

  it('applies border in light mode', () => {
    const { container } = render(<ChatbotMessageInput {...defaultProps} isDarkMode={false} />);

    const innerDiv = container.querySelector('[data-testid="chatbot-message-bar"]')
      ?.parentElement as HTMLElement;
    expect(innerDiv).toHaveStyle({
      border: '1px solid var(--pf-t--global--border--color--default)',
    });
  });

  it('does not apply border in dark mode', () => {
    const { container } = render(<ChatbotMessageInput {...defaultProps} isDarkMode />);

    const innerDiv = container.querySelector('[data-testid="chatbot-message-bar"]')
      ?.parentElement as HTMLElement;
    expect(innerDiv).toHaveStyle({
      border: 'none',
    });
  });
});
