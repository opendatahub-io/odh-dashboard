import React from 'react';
import { Message } from '@patternfly/chatbot';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { ChatbotMessageProps } from '~/app/Chatbot/hooks/useChatbotMessages';
import { ChatbotMessagesMetrics } from '~/app/Chatbot/ChatbotMessagesMetrics';

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
        // Destructure metrics from message to avoid passing it to PatternFly Message component
        const { metrics, ...messageProps } = message;

        // Build extraContent with metrics if present (for bot messages)
        const extraContent =
          message.role === 'bot' && metrics
            ? { endContent: <ChatbotMessagesMetrics metrics={metrics} /> }
            : undefined;

        return (
          <React.Fragment key={message.id}>
            <Message
              {...messageProps}
              extraContent={extraContent}
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
