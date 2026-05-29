import React from 'react';
import { Message } from '@patternfly/chatbot';
import { Stack, StackItem } from '@patternfly/react-core';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { ChatbotMessageProps } from '~/app/Chatbot/hooks/useChatbotMessages';
import { ChatbotMessagesMetrics } from '~/app/Chatbot/ChatbotMessagesMetrics';
import ChatbotFileSearchResults from '~/app/Chatbot/ChatbotFileSearchResults';

type ChatbotMessagesListProps = {
  messageList: ChatbotMessageProps[];
  scrollRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  isStreamingWithoutContent: boolean;
  /** Display name of the selected model (shown in loading state and message headers) */
  modelDisplayName?: string;
  /** Shown as a bot message when the conversation is empty and not loading */
  placeholderContent?: string;
};

const ChatbotMessagesList: React.FC<ChatbotMessagesListProps> = ({
  messageList,
  scrollRef,
  isLoading = false,
  isStreamingWithoutContent = false,
  modelDisplayName = 'Bot',
  placeholderContent,
}) => {
  // Show loading dots only when no message in the list is already showing its own loading state.
  // The embedded flow creates a bot message with isLoading=true in the array, so the
  // standalone loading dots should not also render.
  const hasLoadingMessage = messageList.some((msg) => msg.isLoading);
  const showLoadingDots = isLoading && !isStreamingWithoutContent && !hasLoadingMessage;

  return (
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
        // Destructure extended props to avoid passing them to PatternFly Message component
        const { metrics, fileSearchData, ...messageProps } = message;

        // Build extraContent with file search results and metrics (for bot messages)
        const hasEndContent = message.role === 'bot' && (fileSearchData || metrics);
        const extraContent = hasEndContent
          ? {
              endContent: (
                <Stack hasGutter>
                  {fileSearchData && (
                    <StackItem>
                      <ChatbotFileSearchResults fileSearchData={fileSearchData} />
                    </StackItem>
                  )}
                  {metrics && (
                    <StackItem>
                      <ChatbotMessagesMetrics metrics={metrics} />
                    </StackItem>
                  )}
                </Stack>
              ),
            }
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
