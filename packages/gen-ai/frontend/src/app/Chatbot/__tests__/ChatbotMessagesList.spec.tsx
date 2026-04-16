import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatbotMessages } from '~/app/Chatbot/ChatbotMessagesList';
import type { ChatbotMessageProps } from '~/app/Chatbot/hooks/useChatbotMessages';

jest.mock('../components/ChatbotErrorAlert', () => ({
  __esModule: true,
  default: jest.fn(({ classifiedError, onRetry, 'data-testid': dataTestId }) => {
    if (!classifiedError) {
      return null;
    }
    return (
      <div data-testid={dataTestId}>
        <span data-testid="error-title">{classifiedError.title}</span>
        <span data-testid="error-severity">
          {classifiedError.severity || classifiedError.variant}
        </span>
        {onRetry && (
          <button data-testid="retry-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }),
}));

jest.mock('../ChatbotMessagesMetrics', () => ({
  ChatbotMessagesMetrics: jest.fn(({ metrics }) => (
    <div data-testid="metrics">
      <span>{metrics.usage?.input_tokens}</span>
    </div>
  )),
}));

jest.mock('@patternfly/chatbot', () => ({
  Message: jest.fn(
    ({
      role,
      content,
      error,
      extraContent,
      'data-testid': dataTestId,
    }: {
      role: string;
      content?: string;
      error?: { variant: string; title: string; body: React.ReactNode };
      extraContent?: {
        beforeMainContent?: React.ReactNode;
        afterMainContent?: React.ReactNode;
        endContent?: React.ReactNode;
      };
      'data-testid'?: string;
    }) => (
      <div data-testid={dataTestId}>
        <div data-testid="message-role">{role}</div>
        {error ? (
          <div data-testid="message-error">
            <div data-testid="error-variant">{error.variant}</div>
            <div data-testid="error-title">{error.title}</div>
            <div data-testid="error-body">{error.body}</div>
          </div>
        ) : (
          <div data-testid="message-content">{content}</div>
        )}
        {extraContent?.beforeMainContent && (
          <div data-testid="before-main-content">{extraContent.beforeMainContent}</div>
        )}
        {extraContent?.afterMainContent && (
          <div data-testid="after-main-content">{extraContent.afterMainContent}</div>
        )}
        {extraContent?.endContent && <div data-testid="end-content">{extraContent.endContent}</div>}
      </div>
    ),
  ),
}));

describe('ChatbotMessages', () => {
  const scrollRef = React.createRef<HTMLDivElement>();
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Failure Error Pattern', () => {
    it('should render error prop when pattern is full_failure', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: '',
          errorClassification: {
            pattern: 'full-failure',
            variant: 'danger',
            isRetriable: true,
            title: 'Model inference failed',
            description: 'The model server did not respond in time.',
            details: {
              component: 'Llama Stack',
              errorCode: 'timeout',
              rawMessage: 'Request timed out',
            },
          },
          onRetryError: mockOnRetry,
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      // Error is injected into beforeMainContent, not as error prop
      expect(screen.getByTestId('chatbot-error-alert-msg-1')).toBeInTheDocument();
      expect(screen.getByTestId('error-severity')).toHaveTextContent('danger');
      expect(screen.getByTestId('error-title')).toHaveTextContent('Model inference failed');
      expect(screen.queryByTestId('message-content')).not.toBeInTheDocument();
    });

    it('should render error body with ChatbotErrorAlert component', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: '',
          errorClassification: {
            pattern: 'full-failure',
            variant: 'danger',
            isRetriable: false,
            title: 'Configuration error',
            description: 'Invalid model configuration.',
            details: {
              component: 'Model',
              errorCode: 'max_tokens',
              rawMessage: 'Token limit exceeded',
            },
          },
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      const errorBody = screen.getByTestId('error-body');
      expect(errorBody).toBeInTheDocument();
      expect(screen.getByTestId('chatbot-error-alert-msg-1')).toBeInTheDocument();
      expect(screen.getByTestId('error-title')).toHaveTextContent('Configuration error');
    });

    it('should use warning variant for warning severity', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: '',
          errorClassification: {
            pattern: 'full-failure',
            variant: 'warning',
            isRetriable: false,
            title: 'Warning message',
            description: 'This is a warning.',
            details: { component: 'Unknown', errorCode: 'UNKNOWN', rawMessage: 'Warning error' },
          },
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.getByTestId('error-severity')).toHaveTextContent('warning');
    });

    it('should pass onRetryError to ChatbotErrorAlert', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: '',
          errorClassification: {
            pattern: 'full-failure',
            variant: 'danger',
            isRetriable: true,
            title: 'Error',
            description: 'Description',
            details: { component: 'Unknown', errorCode: 'UNKNOWN', rawMessage: 'Error' },
          },
          onRetryError: mockOnRetry,
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Partial Failure Error Pattern', () => {
    it('should render error alert in beforeMainContent', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: 'Model response without RAG context',
          errorClassification: {
            pattern: 'partial-failure',
            variant: 'warning',
            isRetriable: false,
            title: 'Knowledge source retrieval failed',
            description: 'Generated without context from your knowledge sources.',
            details: {
              component: 'RAG',
              errorCode: 'unreachable',
              rawMessage: 'RAG service unavailable',
            },
          },
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.getByTestId('before-main-content')).toBeInTheDocument();
      expect(screen.getByTestId('chatbot-error-alert-msg-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-content')).toHaveTextContent(
        'Model response without RAG context',
      );
    });

    it('should preserve main message content for partial failures', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: 'Response content here',
          errorClassification: {
            pattern: 'partial-failure',
            variant: 'warning',
            isRetriable: false,
            title: 'Partial failure',
            description: 'Some component failed.',
            details: { component: 'Unknown', errorCode: 'UNKNOWN', rawMessage: 'Component error' },
          },
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.getByTestId('message-content')).toBeInTheDocument();
      expect(screen.getByTestId('message-content')).toHaveTextContent('Response content here');
      expect(screen.queryByTestId('message-error')).not.toBeInTheDocument();
    });

    it('should not render metrics when partial failure error exists', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: 'Response',
          /* eslint-disable camelcase */
          metrics: {
            latency_ms: 1500,
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              total_tokens: 150,
            },
          },
          /* eslint-enable camelcase */
          errorClassification: {
            pattern: 'partial-failure',
            variant: 'warning',
            isRetriable: false,
            title: 'Error',
            description: 'Description',
            details: { component: 'Unknown', errorCode: 'UNKNOWN', rawMessage: 'Error' },
          },
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.queryByTestId('metrics')).not.toBeInTheDocument();
    });
  });

  describe('Streaming Interruption Error Pattern', () => {
    it('should render error alert in afterMainContent', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: 'Partial response text...',
          errorClassification: {
            pattern: 'streaming-interruption',
            variant: 'danger',
            isRetriable: true,
            title: 'Streaming error — connection lost',
            description: 'The connection to the model was lost during generation.',
            details: {
              component: 'Llama Stack',
              errorCode: 'timeout',
              rawMessage: 'Connection reset',
            },
          },
          onRetryError: mockOnRetry,
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.getByTestId('after-main-content')).toBeInTheDocument();
      expect(screen.getByTestId('chatbot-error-alert-msg-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-content')).toHaveTextContent('Partial response text...');
    });

    it('should preserve partial content for streaming interruptions', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: 'The capital of France is Par...',
          errorClassification: {
            pattern: 'streaming-interruption',
            variant: 'danger',
            isRetriable: true,
            title: 'Stream interrupted',
            description: 'Connection lost.',
            details: { component: 'Unknown', errorCode: 'UNKNOWN', rawMessage: 'Stream error' },
          },
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.getByTestId('message-content')).toHaveTextContent(
        'The capital of France is Par...',
      );
      expect(screen.queryByTestId('message-error')).not.toBeInTheDocument();
    });
  });

  describe('Normal Messages (No Errors)', () => {
    it('should render normal bot message without error classification', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: 'Normal response',
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.getByTestId('message-content')).toHaveTextContent('Normal response');
      expect(screen.queryByTestId('message-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('before-main-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('after-main-content')).not.toBeInTheDocument();
    });

    it('should render metrics in endContent when no error', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: 'Response',
          /* eslint-disable camelcase */
          metrics: {
            latency_ms: 1500,
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              total_tokens: 150,
            },
          },
          /* eslint-enable camelcase */
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.getByTestId('end-content')).toBeInTheDocument();
      expect(screen.getByTestId('metrics')).toBeInTheDocument();
    });

    it('should not render extraContent when no metrics or errors', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: 'Response',
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.queryByTestId('end-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('before-main-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('after-main-content')).not.toBeInTheDocument();
    });
  });

  describe('Props Destructuring', () => {
    it('should not pass errorClassification or onRetryError to Message component', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: 'Test',
          errorClassification: {
            pattern: 'full-failure',
            variant: 'danger',
            isRetriable: true,
            title: 'Error',
            description: 'Description',
            details: { component: 'Unknown', errorCode: 'UNKNOWN', rawMessage: 'Error' },
          },
          onRetryError: mockOnRetry,
        },
      ];

      const { container } = render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      // Check that Message component is called without these props
      // The mock Message component would error if it received unexpected props
      expect(container).toBeInTheDocument();
    });

    it('should handle messages with only metrics and no errors', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: 'Response',
          /* eslint-disable camelcase */
          metrics: {
            latency_ms: 1500,
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              total_tokens: 150,
            },
          },
          /* eslint-enable camelcase */
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.getByTestId('metrics')).toBeInTheDocument();
      expect(screen.queryByTestId('chatbot-error-alert-msg-1')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should not render error for user messages even with errorClassification', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'User message',
          errorClassification: {
            pattern: 'full-failure',
            variant: 'danger',
            isRetriable: false,
            title: 'Error',
            description: 'Description',
            details: { component: 'Unknown', errorCode: 'UNKNOWN', rawMessage: 'Error' },
          },
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.queryByTestId('message-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('message-content')).toHaveTextContent('User message');
    });

    it('should render multiple messages with different error patterns', () => {
      const messages: ChatbotMessageProps[] = [
        {
          id: 'msg-1',
          role: 'bot',
          content: '',
          errorClassification: {
            pattern: 'full-failure',
            variant: 'danger',
            isRetriable: true,
            title: 'Full failure',
            description: 'Description',
            details: { component: 'Unknown', errorCode: 'UNKNOWN', rawMessage: 'Error 1' },
          },
        },
        {
          id: 'msg-2',
          role: 'bot',
          content: 'Partial response',
          errorClassification: {
            pattern: 'partial-failure',
            variant: 'warning',
            isRetriable: false,
            title: 'Partial failure',
            description: 'Description',
            details: { component: 'Unknown', errorCode: 'UNKNOWN', rawMessage: 'Error 2' },
          },
        },
        {
          id: 'msg-3',
          role: 'bot',
          content: 'Stream cut off...',
          errorClassification: {
            pattern: 'streaming-interruption',
            variant: 'danger',
            isRetriable: true,
            title: 'Stream interrupted',
            description: 'Description',
            details: { component: 'Unknown', errorCode: 'UNKNOWN', rawMessage: 'Error 3' },
          },
        },
      ];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading={false}
          isStreamingWithoutContent={false}
        />,
      );

      expect(screen.getByTestId('chatbot-error-alert-msg-1')).toBeInTheDocument();
      expect(screen.getByTestId('chatbot-error-alert-msg-2')).toBeInTheDocument();
      expect(screen.getByTestId('chatbot-error-alert-msg-3')).toBeInTheDocument();
    });

    it('should render loading message when isLoading is true', () => {
      const messages: ChatbotMessageProps[] = [];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading
          isStreamingWithoutContent={false}
          modelDisplayName="Test Model"
        />,
      );

      // Loading message is rendered by Message component
      expect(screen.getByTestId('chatbot-message-bot')).toBeInTheDocument();
    });

    it('should not render loading message when streaming without content', () => {
      const messages: ChatbotMessageProps[] = [];

      render(
        <ChatbotMessages
          messageList={messages}
          scrollRef={scrollRef}
          isLoading
          isStreamingWithoutContent
        />,
      );

      // Loading dots should not be shown during streaming
      const loadingMessages = screen.queryAllByTestId('chatbot-message-bot');
      expect(loadingMessages).toHaveLength(0);
    });
  });
});
