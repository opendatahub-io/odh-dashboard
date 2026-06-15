import React from 'react';
import { Button } from '@patternfly/react-core';
import { Message, MessageProps as PFMessageProps } from '@patternfly/chatbot';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { ChatbotMessageProps } from '~/app/Chatbot/hooks/useChatbotMessages';
import { ChatbotMessagesMetrics } from '~/app/Chatbot/ChatbotMessagesMetrics';
import ChatbotErrorAlert from '~/app/Chatbot/components/ChatbotErrorAlert';

type ChatbotMessagesListProps = {
  messageList: ChatbotMessageProps[];
  scrollRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  /** Display name of the selected model (shown in loading state and message headers) */
  modelDisplayName?: string;
  /** Shown as a bot message when the conversation is empty and not loading */
  placeholderContent?: string;
  /** Whether the conversation contains images in user messages (disables image stripping) */
  hasImagesInConversation?: boolean;
  /** Called when the user clicks "View trace" on a bot message with a traceId */
  onViewTrace?: (traceId: string) => void;
};

const ChatbotMessagesList: React.FC<ChatbotMessagesListProps> = ({
  messageList,
  scrollRef,
  isLoading = false,
  modelDisplayName = 'Bot',
  placeholderContent,
  hasImagesInConversation = false,
  onViewTrace,
}) => (
  <>
    {messageList.length === 0 && !isLoading && placeholderContent && (
      <Message
        // eslint-disable-next-line jsx-a11y/aria-role
        role="bot"
        name={modelDisplayName}
        avatar={botAvatar}
        content={placeholderContent}
        data-testid="chatbot-placeholder-message"
        style={{ cursor: 'default', pointerEvents: 'none' }}
      />
    )}
    {messageList.map((message, index) => {
      // Destructure metrics and extraContent from message to avoid passing raw to PatternFly
      const {
        metrics,
        extraContent: messageExtraContent,
        errorClassification,
        onRetryError,
        ...messageProps
      } = message;

      // Build extraContent with metrics and error alerts
      const extraContent: PFMessageProps['extraContent'] = { ...messageExtraContent };

      // Full-failure errors: render as beforeMainContent (above empty content)
      if (
        message.role === 'bot' &&
        errorClassification &&
        errorClassification.pattern === 'full-failure'
      ) {
        extraContent.beforeMainContent = (
          <ChatbotErrorAlert
            classifiedError={errorClassification}
            onRetry={onRetryError}
            data-testid={`chatbot-error-alert-${message.id}`}
          />
        );
      }

      // Add metrics and trace link to endContent (if present and no error)
      if (message.role === 'bot' && metrics && !errorClassification) {
        extraContent.endContent = (
          <>
            <ChatbotMessagesMetrics metrics={metrics} />
            {metrics.trace_id && onViewTrace && (
              <Button
                variant="link"
                isInline
                onClick={() => onViewTrace(metrics.trace_id!)}
                data-testid="view-trace-link"
              >
                View trace
              </Button>
            )}
          </>
        );
      }

      // Partial-failure errors: render as beforeMainContent (warning alert above response)
      // Note: Full-failure errors are already handled above in the same way
      if (
        message.role === 'bot' &&
        errorClassification &&
        errorClassification.pattern === 'partial-failure'
      ) {
        extraContent.beforeMainContent = (
          <ChatbotErrorAlert
            classifiedError={errorClassification}
            onRetry={onRetryError}
            data-testid={`chatbot-error-alert-${message.id}`}
          />
        );
      }

      // Add streaming interruption alert to afterMainContent (danger alert below partial response)
      if (
        message.role === 'bot' &&
        errorClassification &&
        errorClassification.pattern === 'streaming-interruption'
      ) {
        extraContent.afterMainContent = (
          <ChatbotErrorAlert
            classifiedError={errorClassification}
            onRetry={onRetryError}
            data-testid={`chatbot-error-alert-${message.id}`}
          />
        );
      }

      return (
        <React.Fragment key={message.id}>
          <Message
            {...messageProps}
            extraContent={Object.keys(extraContent).length > 0 ? extraContent : undefined}
            data-testid={`chatbot-message-${message.role}`}
            {...(hasImagesInConversation && { hasNoImagesInUserMessages: false })}
          />
          {index === messageList.length - 1 && <div ref={scrollRef} />}
        </React.Fragment>
      );
    })}
  </>
);

const ChatbotMessages = React.memo(ChatbotMessagesList);

export { ChatbotMessages };
