import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotHeaderActions from '~/app/Chatbot/ChatbotHeaderActions';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { useChatbotConfigStore } from '~/app/Chatbot/store';

// Mock the store
jest.mock('~/app/Chatbot/store', () => ({
  useChatbotConfigStore: jest.fn(),
  selectSelectedModel: jest.fn(() => () => 'test-model'),
  selectConfigIds: jest.fn(() => ['default']),
}));

const mockUseChatbotConfigStore = jest.mocked(useChatbotConfigStore);

const createContextValue = (overrides = {}) => ({
  models: [],
  modelsLoaded: true,
  modelsError: undefined,
  aiModels: [],
  aiModelsLoaded: true,
  aiModelsError: undefined,
  maasModels: [],
  maasModelsLoaded: true,
  maasModelsError: undefined,
  lsdStatus: { phase: 'Ready' },
  lsdStatusLoaded: true,
  lsdStatusError: undefined,
  refresh: jest.fn(),
  lastInput: 'test input',
  setLastInput: jest.fn(),
  ...overrides,
});

const TestWrapper: React.FC<{
  children: React.ReactNode;
  contextValue: ReturnType<typeof createContextValue>;
}> = ({ children, contextValue }) => (
  <ChatbotContext.Provider
    value={contextValue as unknown as React.ContextType<typeof ChatbotContext>}
  >
    {children}
  </ChatbotContext.Provider>
);

describe('ChatbotHeaderActions', () => {
  const defaultProps = {
    onViewCode: jest.fn(),
    onConfigurePlayground: jest.fn(),
    onDeletePlayground: jest.fn(),
    onNewChat: jest.fn(),
    onCompareChat: jest.fn(),
    isCompareMode: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChatbotConfigStore.mockImplementation((selector: unknown) => {
      if (typeof selector === 'function') {
        // Return test values based on what the selector is asking for
        return selector({
          configurations: { default: { selectedModel: 'test-model' } },
          configIds: ['default'],
        });
      }
      return undefined;
    });
  });

  describe('Compare Chat button', () => {
    it('renders compare chat button when not in compare mode', () => {
      const contextValue = createContextValue();
      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} isCompareMode={false} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('compare-chat-button')).toBeInTheDocument();
      expect(screen.getByText('Compare chat')).toBeInTheDocument();
    });

    it('hides compare chat button when in compare mode', () => {
      const contextValue = createContextValue();
      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} isCompareMode />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('compare-chat-button')).not.toBeInTheDocument();
    });

    it('calls onCompareChat when compare chat button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnCompareChat = jest.fn();
      const contextValue = createContextValue();

      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions
            {...defaultProps}
            isCompareMode={false}
            onCompareChat={mockOnCompareChat}
          />
        </TestWrapper>,
      );

      await user.click(screen.getByTestId('compare-chat-button'));

      expect(mockOnCompareChat).toHaveBeenCalledTimes(1);
    });

    it('compare chat button has correct aria-label', () => {
      const contextValue = createContextValue();
      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} isCompareMode={false} />
        </TestWrapper>,
      );

      const button = screen.getByTestId('compare-chat-button');
      expect(button).toHaveAttribute('aria-label', 'Compare chat');
    });
  });

  describe('New Chat button', () => {
    it('renders new chat button', () => {
      const contextValue = createContextValue();
      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('new-chat-button')).toBeInTheDocument();
    });

    it('calls onNewChat when clicked', async () => {
      const user = userEvent.setup();
      const mockOnNewChat = jest.fn();
      const contextValue = createContextValue();

      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} onNewChat={mockOnNewChat} />
        </TestWrapper>,
      );

      await user.click(screen.getByTestId('new-chat-button'));

      expect(mockOnNewChat).toHaveBeenCalledTimes(1);
    });

    it('new chat button is visible in both single and compare modes', () => {
      const contextValue = createContextValue();

      const { rerender } = render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} isCompareMode={false} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('new-chat-button')).toBeInTheDocument();

      rerender(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} isCompareMode />
        </TestWrapper>,
      );

      expect(screen.getByTestId('new-chat-button')).toBeInTheDocument();
    });
  });

  describe('View Code button', () => {
    it('renders view code button when enabled', () => {
      const contextValue = createContextValue({ lastInput: 'test' });
      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('view-code-button')).toBeInTheDocument();
    });

    it('disables view code button when no input', () => {
      const contextValue = createContextValue({ lastInput: '' });
      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} />
        </TestWrapper>,
      );

      const button = screen.getByTestId('view-code-button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('calls onViewCode when clicked and enabled', async () => {
      const user = userEvent.setup();
      const mockOnViewCode = jest.fn();
      const contextValue = createContextValue({ lastInput: 'test' });

      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} onViewCode={mockOnViewCode} />
        </TestWrapper>,
      );

      await user.click(screen.getByTestId('view-code-button'));

      expect(mockOnViewCode).toHaveBeenCalledTimes(1);
    });
  });

  describe('LSD status dependent rendering', () => {
    it('shows action buttons when LSD status is Ready', () => {
      const contextValue = createContextValue({ lsdStatus: { phase: 'Ready' } });
      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('compare-chat-button')).toBeInTheDocument();
      expect(screen.getByTestId('new-chat-button')).toBeInTheDocument();
      expect(screen.getByTestId('view-code-button')).toBeInTheDocument();
    });

    it('hides action buttons when LSD status is not Ready', () => {
      const contextValue = createContextValue({ lsdStatus: { phase: 'Pending' } });
      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('compare-chat-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('new-chat-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-code-button')).not.toBeInTheDocument();
    });

    it('hides action buttons when LSD status is null', () => {
      const contextValue = createContextValue({ lsdStatus: null });
      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('compare-chat-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('new-chat-button')).not.toBeInTheDocument();
    });
  });

  describe('Kebab menu', () => {
    it('renders kebab menu toggle', () => {
      const contextValue = createContextValue();
      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('header-kebab-menu-toggle')).toBeInTheDocument();
    });

    it('opens dropdown menu when kebab is clicked', async () => {
      const user = userEvent.setup();
      const contextValue = createContextValue();

      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} />
        </TestWrapper>,
      );

      await user.click(screen.getByTestId('header-kebab-menu-toggle'));

      expect(screen.getByTestId('configure-playground-menu-item')).toBeInTheDocument();
      expect(screen.getByTestId('delete-playground-menu-item')).toBeInTheDocument();
    });

    it('renders configure and delete menu items with correct text', async () => {
      const user = userEvent.setup();
      const contextValue = createContextValue({ lsdStatus: { phase: 'Ready' } });

      render(
        <TestWrapper contextValue={contextValue}>
          <ChatbotHeaderActions {...defaultProps} />
        </TestWrapper>,
      );

      await user.click(screen.getByTestId('header-kebab-menu-toggle'));

      expect(screen.getByTestId('configure-playground-menu-item')).toHaveTextContent(
        'Update configuration',
      );
      expect(screen.getByTestId('delete-playground-menu-item')).toHaveTextContent(
        'Delete playground',
      );
    });
  });
});
