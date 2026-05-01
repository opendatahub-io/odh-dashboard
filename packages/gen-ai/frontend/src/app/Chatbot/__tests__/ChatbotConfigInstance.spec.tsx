import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useChatbotConfigStore } from '~/app/Chatbot/store/useChatbotConfigStore';
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import { DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';
import { ChatbotConfigInstance } from '~/app/Chatbot/ChatbotConfigInstance';

jest.mock('@patternfly/chatbot', () => ({
  MessageBox: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChatbotWelcomePrompt: (props: Record<string, unknown>) => (
    <div data-testid={props['data-testid']}>Welcome</div>
  ),
}));

jest.mock('~/app/Chatbot/ChatbotMessagesList', () => ({
  ChatbotMessages: () => null,
}));

let mockMessages: unknown[] = [];

jest.mock('~/app/Chatbot/hooks/useChatbotMessages', () => ({
  __esModule: true,
  default: () => ({
    get messages() {
      return mockMessages;
    },
    isLoading: false,
    isStreamingWithoutContent: false,
    modelDisplayName: '',
    scrollToBottomRef: { current: null },
    sendMessage: jest.fn(),
    stopStreaming: jest.fn(),
  }),
}));

const defaultProps = {
  configId: DEFAULT_CONFIG_ID,
  currentVectorStoreId: 'vs-inline-abc',
  mcpServers: [],
  mcpServerStatuses: new Map(),
  mcpServerTokens: new Map(),
};

describe('ChatbotConfigInstance', () => {
  beforeEach(() => {
    act(() => {
      useChatbotConfigStore.setState({
        configurations: { [DEFAULT_CONFIG_ID]: { ...DEFAULT_CONFIGURATION } },
        configIds: [DEFAULT_CONFIG_ID],
      });
    });
  });

  describe('selectedVectorStoreId sync', () => {
    it('sets selectedVectorStoreId to currentVectorStoreId when knowledgeMode is inline', () => {
      act(() => {
        useChatbotConfigStore.getState().updateKnowledgeMode(DEFAULT_CONFIG_ID, 'inline');
      });

      render(<ChatbotConfigInstance {...defaultProps} />);

      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedVectorStoreId,
      ).toBe('vs-inline-abc');
    });

    it('clears selectedVectorStoreId to null when knowledgeMode is external', () => {
      // Prime the store with an inline ID as if it was previously in inline mode
      act(() => {
        useChatbotConfigStore.getState().updateKnowledgeMode(DEFAULT_CONFIG_ID, 'inline');
        useChatbotConfigStore
          .getState()
          .updateSelectedVectorStoreId(DEFAULT_CONFIG_ID, 'vs-inline-abc');
      });

      act(() => {
        useChatbotConfigStore.getState().updateKnowledgeMode(DEFAULT_CONFIG_ID, 'external');
      });

      render(<ChatbotConfigInstance {...defaultProps} />);

      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedVectorStoreId,
      ).toBeNull();
    });

    it('updates selectedVectorStoreId when switching from external back to inline', () => {
      act(() => {
        useChatbotConfigStore.getState().updateKnowledgeMode(DEFAULT_CONFIG_ID, 'external');
        useChatbotConfigStore
          .getState()
          .updateSelectedVectorStoreId(DEFAULT_CONFIG_ID, 'vs-external-xyz');
      });

      const { rerender } = render(<ChatbotConfigInstance {...defaultProps} />);

      act(() => {
        useChatbotConfigStore.getState().updateKnowledgeMode(DEFAULT_CONFIG_ID, 'inline');
      });

      rerender(<ChatbotConfigInstance {...defaultProps} />);

      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedVectorStoreId,
      ).toBe('vs-inline-abc');
    });

    it('reflects a new currentVectorStoreId while remaining in inline mode', () => {
      act(() => {
        useChatbotConfigStore.getState().updateKnowledgeMode(DEFAULT_CONFIG_ID, 'inline');
      });

      const { rerender } = render(<ChatbotConfigInstance {...defaultProps} />);

      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedVectorStoreId,
      ).toBe('vs-inline-abc');

      rerender(<ChatbotConfigInstance {...defaultProps} currentVectorStoreId="vs-inline-new" />);

      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedVectorStoreId,
      ).toBe('vs-inline-new');
    });
  });

  describe('welcome prompt visibility', () => {
    beforeEach(() => {
      mockMessages = [];
    });

    it('should show welcome prompt when showWelcomePrompt is true and no user messages exist', () => {
      mockMessages = [{ id: '1', role: 'bot', content: 'placeholder' }];
      render(<ChatbotConfigInstance {...defaultProps} showWelcomePrompt />);
      expect(screen.getByTestId('chatbot-welcome-prompt')).toBeInTheDocument();
    });

    it('should show welcome prompt when messages array is empty', () => {
      mockMessages = [];
      render(<ChatbotConfigInstance {...defaultProps} showWelcomePrompt />);
      expect(screen.getByTestId('chatbot-welcome-prompt')).toBeInTheDocument();
    });

    it('should hide welcome prompt when a user message exists', () => {
      mockMessages = [
        { id: '1', role: 'bot', content: 'placeholder' },
        { id: '2', role: 'user', content: 'Hello' },
      ];
      render(<ChatbotConfigInstance {...defaultProps} showWelcomePrompt />);
      expect(screen.queryByTestId('chatbot-welcome-prompt')).not.toBeInTheDocument();
    });

    it('should not show welcome prompt when showWelcomePrompt is false', () => {
      mockMessages = [];
      render(<ChatbotConfigInstance {...defaultProps} showWelcomePrompt={false} />);
      expect(screen.queryByTestId('chatbot-welcome-prompt')).not.toBeInTheDocument();
    });
  });
});
