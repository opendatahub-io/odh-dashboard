import React from 'react';
import { Alert, Button, Label, Spinner, Title } from '@patternfly/react-core';
import {
  ChatbotFooter,
  ChatbotFootnote,
  ChatbotContent,
  ChatbotWelcomePrompt,
  MessageBar,
  ChatbotDisplayMode,
  Chatbot,
  MessageProps,
  ChatbotHeader,
  ChatbotHeaderActions,
  MessageBox,
  ChatbotHeaderMain,
  ChatbotHeaderTitle,
} from '@patternfly/chatbot';
import { ShareSquareIcon } from '@patternfly/react-icons';
import { completeChat } from '#~/services/llamaStackService';
import useFetchLlamaModels from '#~/utilities/useFetchLlamaModels';
import chatbotUserIcon from '#~/images/UI_icon-Red_Hat-User-Avatar.svg';
import chatbotAvatar from '#~/images/UI_icon-Red_Hat-Chatbot-Avatar.svg';
import RagChatbotMessagesList from './RagChatbotMessagesList';
import RagChatbotShareModal from './RagChatbotShareModal';
import '@patternfly/chatbot/dist/css/main.css';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  stop_reason?: string;
};

const initialBotMessage: MessageProps = {
  id: crypto.randomUUID(),
  role: 'bot',
  content: 'Hello! Ask a question to test out your AI system',
  name: 'Bot',
  avatar: chatbotAvatar,
};

const RagChatbot: React.FC = () => {
  const displayMode = ChatbotDisplayMode.embedded;
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage]);
  const [showPopover, setShowPopover] = React.useState(true);
  const [isShareChatbotOpen, setIsShareChatbotOpen] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const { models, loading, error, fetchLlamaModels } = useFetchLlamaModels();

  const generateId = () => crypto.randomUUID();
  const modelId = models[1]?.identifier;

  const footnoteProps = {
    label: 'Always review AI generated content prior to use.',
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

  React.useEffect(() => {
    const fetchModels = async () => {
      await fetchLlamaModels();
    };

    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (loading) {
    return <Spinner size="sm" />;
  }
  if (error) {
    <Alert variant="warning" isInline title="Cannot fetch models">
      {error}
    </Alert>;
  }

  const handleMessageSend = async (userInput: string) => {
    if (!userInput || !modelId) {
      return;
    }

    setIsMessageSendButtonDisabled(true);

    const userMessage: MessageProps = {
      id: generateId(),
      role: 'user',
      content: userInput,
      name: 'User',
      avatar: chatbotUserIcon,
    };

    const updatedMessages = [...messages, userMessage];

    const transformMessage: ChatMessage[] = updatedMessages.map((msg) => ({
      role: msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.content ?? '',
      // eslint-disable-next-line camelcase
      stop_reason: 'end_of_message',
    }));

    setMessages(updatedMessages);

    try {
      const response = await completeChat(transformMessage, modelId);
      const responseObject = JSON.parse(response);
      const completion = responseObject?.completion_message;

      const assistantMessage: MessageProps = {
        id: generateId(),
        role: 'bot',
        content: completion?.content ?? 'Error receiving response',
        name: 'Bot',
        avatar: chatbotAvatar,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'bot',
          content: 'An error occurred while generating a response.',
          name: 'Bot',
          avatar: chatbotAvatar,
        },
      ]);
    } finally {
      setIsMessageSendButtonDisabled(false);
    }
  };

  return (
    <div style={{ height: '95%' }}>
      {isShareChatbotOpen && (
        <RagChatbotShareModal onToggle={() => setIsShareChatbotOpen(!isShareChatbotOpen)} />
      )}
      <Chatbot displayMode={displayMode} data-testid="chatbot">
        <ChatbotHeader>
          <ChatbotHeaderMain>
            <ChatbotHeaderTitle>
              <Title headingLevel="h1" size="xl" style={{ fontWeight: 'bold' }}>
                Chatbot
              </Title>
              <Label
                variant="outline"
                color="blue"
                style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}
              >
                {modelId}
              </Label>
            </ChatbotHeaderTitle>
          </ChatbotHeaderMain>
          <ChatbotHeaderActions>
            <Button
              icon={<ShareSquareIcon />}
              variant="plain"
              aria-label="Share chatbot"
              data-testid="share-chatbot-button"
              onClick={() => {
                setIsShareChatbotOpen(!isShareChatbotOpen);
              }}
            />
          </ChatbotHeaderActions>
        </ChatbotHeader>
        <ChatbotContent>
          <MessageBox position="bottom">
            <ChatbotWelcomePrompt
              title="Hello, User!"
              description="Ask a question to chat with your model"
            />
            <RagChatbotMessagesList messageList={messages} scrollRef={scrollToBottomRef} />
          </MessageBox>
        </ChatbotContent>
        <ChatbotFooter>
          <MessageBar
            onSendMessage={(message) => {
              if (typeof message === 'string') {
                handleMessageSend(message);
              }
            }}
            hasAttachButton={false}
            isSendButtonDisabled={isMessageSendButtonDisabled}
            data-testid="chatbot-message-bar"
          />
          <ChatbotFootnote {...footnoteProps} />
        </ChatbotFooter>
      </Chatbot>
    </div>
  );
};

export default RagChatbot;
