import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotPaneHeader from '~/app/Chatbot/components/ChatbotPaneHeader';

jest.mock('@patternfly/chatbot', () => ({
  ChatbotHeaderMain: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-chatbot-header-main">{children}</div>
  ),
}));

describe('ChatbotPaneHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no label and no agentName', () => {
    const { container } = render(<ChatbotPaneHeader />);
    expect(container.firstChild).toBeNull();
  });

  it('renders label in compare mode', () => {
    render(<ChatbotPaneHeader label="Chat 1" />);
    expect(screen.getByText('Chat 1')).toBeInTheDocument();
  });

  it('does not render the close button when onCloseClick is not provided', () => {
    render(<ChatbotPaneHeader label="Chat 1" />);
    expect(screen.queryByRole('button', { name: /close pane/i })).not.toBeInTheDocument();
  });

  it('renders close button when onCloseClick is provided', () => {
    render(<ChatbotPaneHeader label="Chat 1" onCloseClick={jest.fn()} />);
    expect(screen.getByRole('button', { name: /close pane/i })).toBeInTheDocument();
  });

  it('calls onCloseClick when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotPaneHeader label="Chat 1" onCloseClick={mockOnCloseClick} />);

    await user.click(screen.getByRole('button', { name: /close pane/i }));

    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);
  });

  it('stops event propagation when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockContainerClick = jest.fn();
    const mockOnCloseClick = jest.fn();

    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={mockContainerClick}>
        <ChatbotPaneHeader label="Chat 1" onCloseClick={mockOnCloseClick} />
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /close pane/i }));

    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);
    expect(mockContainerClick).not.toHaveBeenCalled();
  });

  it('uses custom testIdPrefix for close button', () => {
    render(
      <ChatbotPaneHeader label="Chat 1" testIdPrefix="compare-pane" onCloseClick={jest.fn()} />,
    );
    expect(screen.getByTestId('compare-pane-close-button')).toBeInTheDocument();
  });

  it('renders divider when hasDivider is true', () => {
    const { container } = render(<ChatbotPaneHeader label="Chat 1" hasDivider />);
    expect(container.querySelector('hr')).toBeInTheDocument();
  });

  it('does not render divider when hasDivider is false', () => {
    const { container } = render(<ChatbotPaneHeader label="Chat 1" hasDivider={false} />);
    expect(container.querySelector('hr')).not.toBeInTheDocument();
  });

  it('renders agent name with Agent label when agentName is provided', () => {
    render(<ChatbotPaneHeader agentName="HR Chatbot" />);
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('HR Chatbot')).toBeInTheDocument();
  });

  it('renders Clear agent button when agentName and onClearAgent are provided', () => {
    render(<ChatbotPaneHeader agentName="HR Chatbot" onClearAgent={jest.fn()} />);
    expect(screen.getByTestId('agent-clear-button')).toBeInTheDocument();
  });

  it('calls onClearAgent when Clear agent is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClear = jest.fn();
    render(<ChatbotPaneHeader agentName="HR Chatbot" onClearAgent={mockOnClear} />);

    await user.click(screen.getByTestId('agent-clear-button'));

    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });
});
