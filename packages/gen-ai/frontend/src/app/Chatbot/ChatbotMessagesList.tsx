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

        // Build error props for PatternFly Message (only for full failures)
        const errorProps: PFMessageProps['error'] =
          message.role === 'bot' &&
          errorClassification &&
          errorClassification.pattern === 'full_failure'
            ? {
                variant: errorClassification.severity,
                title: errorClassification.title,
                body: (
                  <ChatbotErrorAlert
                    errorClassification={errorClassification}
                    onRetry={onRetryError}
                    data-testid={`chatbot-error-alert-${message.id}`}
                  />
                ),
              }
            : undefined;

        // Build extraContent with metrics and error alerts
        const extraContent: PFMessageProps['extraContent'] = {};

        // Add metrics to endContent (if present and no error)
        if (message.role === 'bot' && metrics && !errorClassification) {
          extraContent.endContent = <ChatbotMessagesMetrics metrics={metrics} />;
        }

        // Add partial failure alert to beforeMainContent (warning alert above response)
        if (
          message.role === 'bot' &&
          errorClassification &&
          errorClassification.pattern === 'partial_failure'
        ) {
          extraContent.beforeMainContent = (
            <ChatbotErrorAlert
              errorClassification={errorClassification}
              onRetry={onRetryError}
              data-testid={`chatbot-error-alert-${message.id}`}
            />
          );
        }

        // Add streaming interruption alert to afterMainContent (danger alert below partial response)
        if (
          message.role === 'bot' &&
          errorClassification &&
          errorClassification.pattern === 'streaming_interruption'
        ) {
          extraContent.afterMainContent = (
            <ChatbotErrorAlert
              errorClassification={errorClassification}
              onRetry={onRetryError}
              data-testid={`chatbot-error-alert-${message.id}`}
            />
          );
        }

        return (
          <React.Fragment key={message.id}>
            <Message
              {...messageProps}
              error={errorProps}
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
