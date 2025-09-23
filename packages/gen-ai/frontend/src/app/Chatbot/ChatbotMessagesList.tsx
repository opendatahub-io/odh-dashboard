import React from 'react';
import { Message, MessageProps } from '@patternfly/chatbot';
import botAvatar from '~/app/bgimages/bot_avatar.svg';

type ChatbotMessagesListProps = {
  messageList: MessageProps[];
  scrollRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  isStreamingWithoutContent: boolean;
};

const ChatbotMessagesList: React.FC<ChatbotMessagesListProps> = ({
  messageList,
  scrollRef,
  isLoading = false,
  isStreamingWithoutContent = false,
}) => {
  // Show loading dots only for non-streaming requests
  // Disable loading dots entirely during streaming
  const showLoadingDots = isLoading && !isStreamingWithoutContent;

  return (
    <>
      {messageList.map((message, index) => (
        <React.Fragment key={message.id}>
          <Message {...message} />
          {index === messageList.length - 1 && <div ref={scrollRef} />}
        </React.Fragment>
      ))}
      {/* eslint-disable-next-line jsx-a11y/aria-role */}
      {showLoadingDots && <Message name="Bot" role="bot" avatar={botAvatar} isLoading />}
    </>
  );
};

const ChatbotMessages = React.memo(ChatbotMessagesList);

export { ChatbotMessages };
