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
const mockUseChatbotMessages = jest.fn<Record<string, unknown>, [Record<string, unknown>]>(() => ({
  get messages() {
    return mockMessages;
  },
  isLoading: false,
  isStreamingWithoutContent: false,
  modelDisplayName: '',
  scrollToBottomRef: { current: null },
  sendMessage: jest.fn(),
  stopStreaming: jest.fn(),
}));

jest.mock('~/app/Chatbot/hooks/useChatbotMessages', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockUseChatbotMessages(props),
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

    it('preserves selectedVectorStoreId on remount when knowledgeMode is already external', () => {
      // Simulates compare mode entry: the component unmounts and remounts with external mode
      // already active and a store already selected — the selection must not be wiped.
      act(() => {
        useChatbotConfigStore.getState().updateKnowledgeMode(DEFAULT_CONFIG_ID, 'external');
        useChatbotConfigStore
          .getState()
          .updateSelectedVectorStoreId(DEFAULT_CONFIG_ID, 'vs-external-xyz');
      });

      render(<ChatbotConfigInstance {...defaultProps} />);

      expect(
        useChatbotConfigStore.getState().configurations[DEFAULT_CONFIG_ID]?.selectedVectorStoreId,
      ).toBe('vs-external-xyz');
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

    it('should show welcome prompt when messages array is empty', () => {
      mockMessages = [];
      render(<ChatbotConfigInstance {...defaultProps} showWelcomePrompt />);
      expect(screen.getByTestId('chatbot-welcome-prompt')).toBeInTheDocument();
    });

    it('should hide welcome prompt when any messages exist', () => {
      mockMessages = [{ id: '1', role: 'user', content: 'Hello' }];
      render(<ChatbotConfigInstance {...defaultProps} showWelcomePrompt />);
      expect(screen.queryByTestId('chatbot-welcome-prompt')).not.toBeInTheDocument();
    });

    it('should not show welcome prompt when showWelcomePrompt is false', () => {
      mockMessages = [];
      render(<ChatbotConfigInstance {...defaultProps} showWelcomePrompt={false} />);
      expect(screen.queryByTestId('chatbot-welcome-prompt')).not.toBeInTheDocument();
    });
  });

  describe('template variable substitution', () => {
    beforeEach(() => {
      mockUseChatbotMessages.mockClear();
    });

    it('passes substituted instruction (not raw template) to useChatbotMessages', () => {
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSystemInstruction(DEFAULT_CONFIG_ID, 'Hello {{name}}, welcome to {{project}}');
        useChatbotConfigStore.getState().updateVariableValues(DEFAULT_CONFIG_ID, {
          name: 'Alice',
          project: 'GenAI Studio',
        });
      });

      render(<ChatbotConfigInstance {...defaultProps} />);

      const lastCall = mockUseChatbotMessages.mock.calls.at(-1);
      expect(lastCall?.[0]).toMatchObject({
        systemInstruction: 'Hello Alice, welcome to GenAI Studio',
      });
    });

    it('substitutes unfilled variables to empty string', () => {
      act(() => {
        useChatbotConfigStore
          .getState()
          .updateSystemInstruction(DEFAULT_CONFIG_ID, 'You are {{role}} for {{company}}');
        useChatbotConfigStore.getState().updateVariableValues(DEFAULT_CONFIG_ID, {
          role: 'an assistant',
        });
      });

      render(<ChatbotConfigInstance {...defaultProps} />);

      const lastCall = mockUseChatbotMessages.mock.calls.at(-1);
      expect(lastCall?.[0]).toMatchObject({
        systemInstruction: 'You are an assistant for ',
      });
    });

    it('passes raw instruction unchanged when no variables are present', () => {
      const instruction = 'You are a helpful assistant.';
      act(() => {
        useChatbotConfigStore.getState().updateSystemInstruction(DEFAULT_CONFIG_ID, instruction);
        useChatbotConfigStore.getState().updateVariableValues(DEFAULT_CONFIG_ID, {});
      });

      render(<ChatbotConfigInstance {...defaultProps} />);

      const lastCall = mockUseChatbotMessages.mock.calls.at(-1);
      expect(lastCall?.[0]).toMatchObject({ systemInstruction: instruction });
    });
  });
});
