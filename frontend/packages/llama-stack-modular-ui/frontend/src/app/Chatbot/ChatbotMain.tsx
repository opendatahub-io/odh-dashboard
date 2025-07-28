/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DropEvent,
  Label,
  Spinner,
  Title,
} from '@patternfly/react-core';
import {
  Chatbot,
  ChatbotContent,
  ChatbotDisplayMode,
  ChatbotFooter,
  ChatbotFootnote,
  ChatbotHeader,
  ChatbotHeaderMain,
  ChatbotHeaderTitle,
  ChatbotWelcomePrompt,
  MessageBar,
  MessageBox,
  MessageProps,
} from '@patternfly/chatbot';
import userAvatar from '../bgimages/user_avatar.svg';
import botAvatar from '../bgimages/bot_avatar.svg';
import useFetchLlamaModels from '@app/utilities/useFetchLlamaModels';
import { ChatMessage, completeChat } from '@app/services/llamaStackService';
import { getId } from '@app/utilities/utils';
import { ChatbotMessages } from './ChatbotMessagesList';
import {
  ChatbotSourceSettings,
  ChatbotSourceSettingsModal,
} from './sourceUpload/ChatbotSourceSettingsModal';
import { ChatbotSourceUploadPanel } from './sourceUpload/ChatbotSourceUploadPanel';
import '@patternfly/chatbot/dist/css/main.css';

const initialBotMessage: MessageProps = {
  id: getId(),
  role: 'bot',
  content: 'Hello! Ask a question to test out your AI system',
  name: 'Bot',
  avatar: botAvatar,
};

const ChatbotMain: React.FunctionComponent = () => {
  const [alertKey, setAlertKey] = React.useState<number>(0);
  const displayMode = ChatbotDisplayMode.embedded;
  const { models, loading, error, fetchLlamaModels } = useFetchLlamaModels();
  const modelId = models[1]?.identifier;
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [isSourceSettingsOpen, setIsSourceSettingsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage]);
  const [selectedSource, setSelectedSource] = React.useState<File[]>([]);
  const [selectedSourceSettings, setSelectedSourceSettings] =
    React.useState<ChatbotSourceSettings | null>(null);
  const [showPopover, setShowPopover] = React.useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);

  const footnoteProps = {
    label: 'Always review AI generated content prior to use',
    popover: {
      title: 'Verify information',
      description:
        'While ChatBot strives for accuracy, AI is experimental and can make mistakes. We cannot guarantee that all information provided by ChatBot is up to date or without error. You should always verify responses using reliable sources, especially for crucial information and decision making.',
      bannerImage: {
        src: 'https://cdn.dribbble.com/userupload/10651749/file/original-8a07b8e39d9e8bf002358c66fce1223e.gif',
        alt: 'Image for footnote popover',
      },
      isVisible: showPopover,
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

  const successAlert = showSuccessAlert ? (
    <Alert
      key={`source-upload-success-${alertKey}`}
      isInline
      variant="success"
      title="Source uploaded"
      timeout={4000}
      actionClose={<AlertActionCloseButton onClose={() => setShowSuccessAlert(false)} />}
      onTimeout={() => setShowSuccessAlert(false)}
    >
      <p>
        This source must be chunked and embedded before it is available for retrieval. This may take
        a few minutes depending on the size.
      </p>
    </Alert>
  ) : (
    <></>
  );

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

  React.useEffect(() => {
    if (selectedSource.length > 0) {
      setIsSourceSettingsOpen(true);
    }
  }, [selectedSource]);

  if (loading) {
    return <Spinner size="sm" />;
  }

  // TODO: Uncomment this when we have the BFF working
  // if (error) {
  //   return <Alert variant="warning" isInline title="Cannot fetch models">
  //     {error}
  //   </Alert>;
  // };

  const handleSourceDrop = (event: DropEvent, source: File[]) => {
    setSelectedSource(source);
    setSelectedSourceSettings(null);
  };

  const removeUploadedSource = (sourceName: string) => {
    setSelectedSource((sources) => sources.filter((f) => f.name !== sourceName));
  };

  const handleMessageSend = async (userInput: string) => {
    if (!userInput || !modelId) {
      return;
    }

    setIsMessageSendButtonDisabled(true);

    const userMessage: MessageProps = {
      id: getId(),
      role: 'user',
      content: userInput,
      name: 'User',
      avatar: userAvatar,
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
        id: getId(),
        role: 'bot',
        content: completion?.content ?? 'Error receiving response',
        name: 'Bot',
        avatar: botAvatar,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: getId(),
          role: 'bot',
          content: `An error occurred while generating a response: ${err}`,
          name: 'Bot',
          avatar: botAvatar,
        },
      ]);
    } finally {
      setIsMessageSendButtonDisabled(false);
    }
  };

  const showAlert = () => {
    setAlertKey((key) => key + 1);
    setShowSuccessAlert(true);
  };

  const handleSourceSettingsSubmit = (settings: ChatbotSourceSettings | null) => {
    setSelectedSourceSettings(settings);
    setIsSourceSettingsOpen(!isSourceSettingsOpen);

    if (settings?.chunkOverlap && settings?.maxChunkLength) {
      showAlert();
    } else {
      setSelectedSource([]);
    }
  };

  return (
    <>
      {isSourceSettingsOpen && (
        <ChatbotSourceSettingsModal
          onToggle={() => setIsSourceSettingsOpen(!isSourceSettingsOpen)}
          onSubmitSettings={handleSourceSettingsSubmit}
        />
      )}
      <Drawer isExpanded isInline position="right">
        <DrawerContent
          panelContent={
            <ChatbotSourceUploadPanel
              alert={successAlert}
              handleSourceDrop={handleSourceDrop}
              selectedSource={selectedSource}
              selectedSourceSettings={selectedSourceSettings}
              removeUploadedSource={removeUploadedSource}
              setSelectedSourceSettings={setSelectedSourceSettings}
            />
          }
        >
          <DrawerContentBody
            style={{ overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
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
              </ChatbotHeader>
              <ChatbotContent>
                <MessageBox position="bottom">
                  <ChatbotWelcomePrompt
                    title="Hello, User!"
                    description="Ask a question to chat with your model"
                  />
                  <ChatbotMessages messageList={messages} scrollRef={scrollToBottomRef} />
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
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export { ChatbotMain };
