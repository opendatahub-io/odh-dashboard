import React from 'react';
import { Message, MessageProps } from '@patternfly/chatbot';

type RagChatbotMessagesListProps = {
  messageList: MessageProps[];
  scrollRef: React.RefObject<HTMLDivElement>;
};

const RagChatbotMessagesList: React.FC<RagChatbotMessagesListProps> = ({
  messageList,
  scrollRef,
}) => (
  <>
    {messageList.map((message, index) => (
      <React.Fragment key={message.id}>
        <Message {...message} />
        {index === messageList.length - 1 && <div ref={scrollRef} />}
      </React.Fragment>
    ))}
  </>
);

export default React.memo(RagChatbotMessagesList);
