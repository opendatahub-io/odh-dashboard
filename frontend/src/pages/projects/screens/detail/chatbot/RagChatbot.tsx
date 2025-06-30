/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import React from 'react';
import { Button, Title } from '@patternfly/react-core';
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
  ChatbotAlert,
  Message,
} from '@patternfly/chatbot';
import { ShareSquareIcon } from '@patternfly/react-icons';
import { completeChat } from '#~/services/llamaStackService';
import chatbotUserIcon from '#~/images/UI_icon-Red_Hat-User-Avatar.svg';
import chatbotAvatar from '#~/images/UI_icon-Red_Hat-Chatbot-Avatar.svg';
import '@patternfly/chatbot/dist/css/main.css';

export type Source = {
  link: string;
  title?: string;
  body?: React.ReactNode | string;
};

export type UserFacingFile = {
  name: string;
  id: string;
  blob: Blob;
};

export type SourceResponse = {
  content: { metadata: { source: string }; text: string }[];
};

const RagChatbot: React.FC = () => {
  const [isSendButtonDisabled, setIsSendButtonDisabled] = React.useState(true);
  const [messages, setMessages] = React.useState<MessageProps[]>([]);
  const [currentMessage, setCurrentMessage] = React.useState<string[]>([]);
  const [currentSources, setCurrentSources] = React.useState<Source[]>();
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<{ title: string; body: string }>();
  const [announcement, setAnnouncement] = React.useState<string>();
  const [controller, setController] = React.useState<AbortController>();
  const [currentDate, setCurrentDate] = React.useState<Date>();
  const [hasStopButton, setHasStopButton] = React.useState(false);

  React.useEffect(() => {
    if (scrollToBottomRef.current) {
      if (messages.length > 0 || currentMessage.length > 0 || currentSources) {
        scrollToBottomRef.current.scrollIntoView();
      }
    }
  }, [messages, currentMessage, currentSources]);

  const ERROR_BODY = {
    'Error: 404':
      'The chatbot API endpoint was not found. Please check if the API is running and accessible.',
    'Error: 500': 'The chatbot API encountered an internal error. Please try again later.',
    'Error: 401': 'Authentication failed. Please check your credentials.',
    'Error: 403': 'Access denied. You do not have permission to use this chatbot.',
    'Error: No response body': 'The chatbot API did not return a valid response. Please try again.',
    'Error: Other': 'An unexpected error occurred. Please try again later.',
  };

  const handleError = (e: Error) => {
    const errorKey = `Error: ${e.message}`;
    const title = 'Error';
    let body: string;

    if (errorKey === 'Error: 404') {
      body = ERROR_BODY['Error: 404'];
    } else if (errorKey === 'Error: 500') {
      body = ERROR_BODY['Error: 500'];
    } else if (errorKey === 'Error: 401') {
      body = ERROR_BODY['Error: 401'];
    } else if (errorKey === 'Error: 403') {
      body = ERROR_BODY['Error: 403'];
    } else if (errorKey === 'Error: No response body') {
      body = ERROR_BODY['Error: No response body'];
    } else {
      body = `Unexpected error: ${e.message}`;
    }

    setError({ title, body });
    setAnnouncement(`Error: ${title} ${body}`);
  };

  async function fetchData(userMessage: string) {
    if (controller) {
      controller.abort();
      setHasStopButton(false);
    }

    const newController = new AbortController();
    setController(newController);
    setHasStopButton(true);
    setCurrentMessage([]);
    try {
      let fullText = '';

      const response = await completeChat(
        {
          message: userMessage,
          assistantName: 'Chatbot',
        },
        newController.signal,
      );

      const reader = response.getReader();
      const decoder = new TextDecoder('utf-8');
      const sources: string[] = [];

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setCurrentMessage([fullText]);
              }
            } catch (e) {
              // Error parsing SSE data
            }
          }
        }
      }

      if (sources.length > 0) {
        const sourcesString = sources.join('');
        const parsedSources: SourceResponse = JSON.parse(sourcesString);
        const formattedSources: Source[] = [];
        parsedSources.content.forEach((source) => {
          formattedSources.push({ link: source.metadata.source, body: source.text });
        });
        setController(newController);
        return formattedSources;
      }

      return undefined;
    } catch (streamError) {
      if (streamError instanceof Error) {
        if (streamError.name !== 'AbortError') {
          handleError(streamError);
        }
      }
      return undefined;
    } finally {
      setController(undefined);
    }
  }

  const handleSend = async (input: string) => {
    setIsSendButtonDisabled(true);
    const date = new Date();
    const newMessages = structuredClone(messages);
    if (currentMessage.length > 0) {
      newMessages.push({
        avatar: chatbotAvatar,
        id: crypto.randomUUID(),
        name: 'Chatbot',
        role: 'bot',
        content: currentMessage.join(''),
        ...(currentSources && { sources: { sources: currentSources } }),
        timestamp: currentDate
          ? `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`
          : `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
      });
      setCurrentMessage([]);
      setCurrentSources(undefined);
      setCurrentDate(undefined);
    }
    newMessages.push({
      avatar: chatbotUserIcon,
      id: crypto.randomUUID(),
      name: 'You',
      role: 'user',
      content: input,
      timestamp: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
    });
    setMessages(newMessages);
    setCurrentDate(date);
    setAnnouncement(`Message from You: ${input}. Message from Chatbot is loading.`);

    const sources = await fetchData(input);
    if (sources) {
      setCurrentSources(sources);
    }
    if (currentMessage.length > 0) {
      setAnnouncement(`Message from Chatbot: ${currentMessage.join('')}`);
    }
    setHasStopButton(false);
  };

  const displayMode = ChatbotDisplayMode.embedded;

  const handleStopButton = () => {
    if (controller) {
      controller.abort();
    }
    setHasStopButton(false);
  };

  const handleChange = (_event: React.ChangeEvent<HTMLTextAreaElement>, value: string | number) => {
    setIsSendButtonDisabled(value === '');
  };

  return (
    <Chatbot displayMode={displayMode}>
      <ChatbotHeader>
        <ChatbotHeaderMain>
          <ChatbotHeaderTitle>
            <Title headingLevel="h1" size="xl" style={{ fontWeight: 'bold' }}>
              Chatbot
            </Title>
          </ChatbotHeaderTitle>
        </ChatbotHeaderMain>
        <ChatbotHeaderActions>
          <Button
            icon={<ShareSquareIcon />}
            variant="plain"
            aria-label="Share chatbot"
            data-testid="share-chatbot-button"
          />
        </ChatbotHeaderActions>
      </ChatbotHeader>
      <ChatbotContent>
        <MessageBox announcement={announcement}>
          {error && (
            <ChatbotAlert variant="danger" onClose={() => setError(undefined)} title={error.title}>
              {error.body}
            </ChatbotAlert>
          )}
          <ChatbotWelcomePrompt
            title="Hello, Chatbot User"
            description="How may I help you today?"
          />
          {messages.map((message) => (
            <Message key={message.id} {...message} />
          ))}
          {currentMessage.length > 0 && (
            <Message
              avatar={chatbotAvatar}
              name="Chatbot"
              key="currentMessage"
              // eslint-disable-next-line jsx-a11y/aria-role
              role="bot"
              content={currentMessage[0]}
              {...(currentSources && { sources: { sources: currentSources } })}
              timestamp={`${currentDate?.toLocaleDateString() || ''} ${
                currentDate?.toLocaleTimeString() || ''
              }`}
            />
          )}
          <div ref={scrollToBottomRef} />
        </MessageBox>
      </ChatbotContent>
      <ChatbotFooter>
        <MessageBar
          onSendMessage={(message) => {
            if (typeof message === 'string') {
              handleSend(message);
            }
          }}
          hasStopButton={hasStopButton}
          handleStopButton={handleStopButton}
          alwayShowSendButton
          onChange={handleChange}
          isSendButtonDisabled={isSendButtonDisabled}
          hasAttachButton={false}
        />
        <ChatbotFootnote label="Verify all information from this tool. LLMs make mistakes." />
      </ChatbotFooter>
    </Chatbot>
  );
};

export default RagChatbot;
