import React from 'react';
import { Message, MessageProps as PFMessageProps } from '@patternfly/chatbot';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { ChatbotMessageProps } from '~/app/Chatbot/hooks/useChatbotMessages';
import { ChatbotMessagesMetrics } from '~/app/Chatbot/ChatbotMessagesMetrics';
import ChatbotErrorAlert from '~/app/Chatbot/components/ChatbotErrorAlert';

type ChatbotMessagesListProps = {
  messageList: ChatbotMessageProps[];
  scrollRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  isStreamingWithoutContent: boolean;
  /** Display name of the selected model (shown in loading state and message headers) */
  modelDisplayName?: string;
};

const ChatbotMessagesList: React.FC<ChatbotMessagesListProps> = ({
  messageList,
  scrollRef,
  isLoading = false,
  isStreamingWithoutContent = false,
  modelDisplayName = 'Bot',
}) => {
  // Show loading dots only for non-streaming requests
  // During streaming, loading dots are handled within the bot message itself
  const showLoadingDots = isLoading && !isStreamingWithoutContent;

  return (
    <>
      {messageList.map((message, index) => {
        // Destructure custom props from message to avoid passing them to PatternFly Message component
        const { metrics, errorClassification, onRetryError, ...messageProps } = message;

        // Build extraContent with metrics and error alerts
        const extraContent: PFMessageProps['extraContent'] = {};

        // Full-failure errors: render as beforeMainContent (above empty content)
        if (
          message.role === 'bot' &&
          errorClassification &&
          errorClassification.pattern === 'full-failure'
        ) {
          // eslint-disable-next-line no-console
          console.log('[ChatbotMessagesList] Rendering full-failure error', {
            pattern: errorClassification.pattern,
            isRetriable: errorClassification.isRetriable,
            hasOnRetry: !!onRetryError,
            messageId: message.id,
          });

          extraContent.beforeMainContent = (
            <ChatbotErrorAlert
              classifiedError={errorClassification}
              onRetry={onRetryError}
              data-testid={`chatbot-error-alert-${message.id}`}
            />
          );
        }

        // Add metrics to endContent (if present and no error)
        if (message.role === 'bot' && metrics && !errorClassification) {
          extraContent.endContent = <ChatbotMessagesMetrics metrics={metrics} />;
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
            />
            {index === messageList.length - 1 && <div ref={scrollRef} />}
          </React.Fragment>
        );
      })}
      {showLoadingDots && (
        <Message
          name={modelDisplayName}
          // eslint-disable-next-line jsx-a11y/aria-role
          role="bot"
          avatar={botAvatar}
          isLoading
          data-testid="chatbot-message-bot"
        />
      )}
    </>
  );
};

const ChatbotMessages = React.memo(ChatbotMessagesList);

export { ChatbotMessages };
