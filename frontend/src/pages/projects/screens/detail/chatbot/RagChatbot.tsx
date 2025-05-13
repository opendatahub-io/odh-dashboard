import React, { useState } from 'react';
import { Label } from '@patternfly/react-core';
import Chatbot, { ChatbotDisplayMode } from '@patternfly/chatbot/dist/esm/Chatbot';
import { ChatbotContent } from '@patternfly/chatbot/dist/esm/ChatbotContent';
import { ChatbotWelcomePrompt } from '@patternfly/chatbot/dist/esm/ChatbotWelcomePrompt';
import { ChatbotFooter, ChatbotFootnote } from '@patternfly/chatbot/dist/esm/ChatbotFooter';
import { MessageBar } from '@patternfly/chatbot/dist/esm/MessageBar';
import { MessageBox } from '@patternfly/chatbot/dist/esm/MessageBox';
import { ChatbotHeader, ChatbotHeaderActions } from '@patternfly/chatbot/dist/esm/ChatbotHeader';
import '@patternfly/chatbot/dist/css/main.css';

const RagChatbot: React.FC = () => {
  const displayMode = ChatbotDisplayMode.embedded;
  const [showPopover, setShowPopover] = useState(true);

  const model = 'Llama 3.2';
  const footnoteProps = {
    label: 'ChatBot uses AI. Check for mistakes.',
    popover: {
      title: 'Verify information',
      description:
        'While ChatBot strives for accuracy, AI is experimental and can make mistakes. We cannot guarantee that all information provided by ChatBot is up to date or without error. You should always verify responses using reliable sources, especially for crucial information and decision making.',
      bannerImage: {
        src: 'https://cdn.dribbble.com/userupload/10651749/file/original-8a07b8e39d9e8bf002358c66fce1223e.gif',
        alt: 'Image for footnote popover',
      },
      isPopoverVisible: showPopover,
      cta: {
        label: 'Dismiss',
        onClick: () => setShowPopover(!showPopover),
      },
      link: {
        label: 'View AI policy',
        url: 'https://www.redhat.com/',
      },
    },
  };

  return (
    <div style={{ height: '95%' }}>
      <Chatbot displayMode={displayMode} data-testid="chatbot">
        <ChatbotHeader>
          <ChatbotHeaderActions>
            <Label variant="outline" color="blue">
              {model}
            </Label>
          </ChatbotHeaderActions>
        </ChatbotHeader>
        <ChatbotContent style={{ maxHeight: '59vh' }}>
          <MessageBox announcement="">
            <ChatbotWelcomePrompt
              title="Hi, Llama Stack User!"
              description="How can I help you today?"
            />
          </MessageBox>
        </ChatbotContent>
        <ChatbotFooter>
          <MessageBar
            onSendMessage={() => {
              // TODO: implement message sending
            }}
            hasMicrophoneButton
          />
          <ChatbotFootnote {...footnoteProps} />
        </ChatbotFooter>
      </Chatbot>
    </div>
  );
};

export default RagChatbot;
