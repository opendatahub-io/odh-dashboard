/* eslint-disable no-restricted-imports */
import React, { useEffect, useState } from 'react';
import { Label } from '@patternfly/react-core';
import {
  ChatbotHeader,
  ChatbotFooter,
  ChatbotHeaderActions,
  ChatbotFootnote,
  ChatbotContent,
  MessageBox,
  ChatbotWelcomePrompt,
  MessageBar,
  ChatbotDisplayMode,
  Chatbot,
} from '@patternfly/chatbot';
import type { Model as LlamaModel } from 'llama-stack-client/resources/models';
import { createLlamaStackClient } from '~/api/llamaStack';
import '@patternfly/chatbot/dist/css/main.css';

const RagChatbot: React.FC = () => {
  const llamaClient = createLlamaStackClient('llamastack', 'llama-test-milvus-service');
  const displayMode = ChatbotDisplayMode.embedded;
  const [showPopover, setShowPopover] = useState(true);
  const [models, setModels] = useState<LlamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const modelName = 'Llama 3.2';
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

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const modelList = await llamaClient.models.list();
        setModels(modelList);
      } catch (err) {
        setError('Failed to fetch models');
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [llamaClient.models]);

  if (loading) {
    return <div>Loading models...</div>;
  }
  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div style={{ height: '95%' }}>
      <h2 className="text-xl font-bold mb-2">Available Models</h2>
      <ul className="list-disc pl-6">
        {models.map((model) => (
          <li key={model.identifier}>{model.identifier}</li>
        ))}
      </ul>
      <Chatbot displayMode={displayMode} data-testid="chatbot">
        <ChatbotHeader>
          <ChatbotHeaderActions>
            <Label variant="outline" color="blue">
              {modelName}
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
