/* eslint-disable camelcase */
import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DropEvent,
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

import userAvatar from '~/app/bgimages/user_avatar.svg';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { extractTextFromFile } from '~/app/utilities/extractPdfText';
import useFetchLlamaModels from '~/app/hooks/useFetchLlamaModels';
import { uploadSource, querySource } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings, Query } from '~/app/types';
import '@patternfly/chatbot/dist/css/main.css';
import { getId } from '~/app/utilities/utils';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import { ChatbotMessages } from './ChatbotMessagesList';
import { ChatbotSettingsPanel } from './components/ChatbotSettingsPanel';
import {
  ALERT_TIMEOUT_MS,
  DEFAULT_EXPANDED_ACCORDION_ITEMS,
  QUERY_CONFIG,
  SAMPLING_STRATEGY,
  initialBotMessage,
  ERROR_MESSAGES,
} from './const';

const ChatbotMain: React.FunctionComponent = () => {
  const [alertKey, setAlertKey] = React.useState<number>(0);
  const displayMode = ChatbotDisplayMode.fullscreen;
  const { models, loading, error, fetchLlamaModels } = useFetchLlamaModels();
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [isSourceSettingsOpen, setIsSourceSettingsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage()]);
  const [selectedSource, setSelectedSource] = React.useState<File[]>([]);
  const [selectedSourceSettings, setSelectedSourceSettings] =
    React.useState<ChatbotSourceSettings | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = React.useState(false);
  const [showErrorAlert, setShowErrorAlert] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const [expandedAccordionItems, setExpandedAccordionItems] = React.useState<string[]>(
    DEFAULT_EXPANDED_ACCORDION_ITEMS,
  );
  const [systemInstructions, setSystemInstructions] = React.useState('');
  const [isSystemInstructionsReadOnly, setIsSystemInstructionsReadOnly] = React.useState(true);
  const [originalSystemInstructions, setOriginalSystemInstructions] =
    React.useState(systemInstructions);
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [extractedText, setExtractedText] = React.useState<string>('');
  const modelId = selectedModel || models[0]?.identifier;

  const successAlert = showSuccessAlert ? (
    <Alert
      key={`source-upload-success-${alertKey}`}
      isInline
      variant="success"
      title="Source uploaded"
      timeout={ALERT_TIMEOUT_MS}
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

  const errorAlert = showErrorAlert ? (
    <Alert
      key={`source-upload-error-${alertKey}`}
      isInline
      variant="danger"
      title="Failed to upload source"
      timeout={ALERT_TIMEOUT_MS}
      actionClose={<AlertActionCloseButton onClose={() => setShowErrorAlert(false)} />}
      onTimeout={() => setShowErrorAlert(false)}
    >
      <p>Please try again.</p>
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

  if (error) {
    return (
      <Alert variant="warning" isInline title="Cannot fetch models">
        {error}
      </Alert>
    );
  }

  const handleSourceDrop = async (event: DropEvent, source: File[]) => {
    setSelectedSource(source);

    if (source.length > 0) {
      try {
        const textFromFile = await extractTextFromFile(source[0]);
        setExtractedText(textFromFile);
      } catch {
        setExtractedText('');
        setSelectedSource([]);
      }
    }
  };

  const removeUploadedSource = () => {
    setExtractedText('');
    setSelectedSource([]);
    setSelectedSourceSettings(null);
  };

  const showSuccAlert = () => {
    setAlertKey((key) => key + 1);
    setShowSuccessAlert(true);
  };

  const showErrAlert = () => {
    setAlertKey((key) => key + 1);
    setShowErrorAlert(true);
  };

  const handleSourceSettingsSubmit = async (settings: ChatbotSourceSettings | null) => {
    setSelectedSourceSettings(settings);
    setIsSourceSettingsOpen(!isSourceSettingsOpen);

    if (settings && settings.chunkOverlap && settings.maxChunkLength) {
      const source = {
        documents: [
          {
            document_id: selectedSource[0].name,
            content: extractedText,
          },
        ],
      };
      const sourceSettings = {
        embeddingModel: settings.embeddingModel,
        vectorDB: settings.vectorDB,
        delimiter: settings.delimiter,
        chunkOverlap: settings.chunkOverlap,
        maxChunkLength: settings.maxChunkLength,
      };

      try {
        await uploadSource(source, sourceSettings);
        showSuccAlert();
      } catch {
        showErrAlert();
      }
    } else {
      setSelectedSource([]);
      setShowErrorAlert(false);
      setShowSuccessAlert(false);
      setExtractedText('');
    }
  };

  const handleEditSystemInstructions = () => {
    setOriginalSystemInstructions(systemInstructions);
    setIsSystemInstructionsReadOnly(false);
  };

  const handleSaveSystemInstructions = () => {
    setIsSystemInstructionsReadOnly(true);
    // TODO
  };

  const handleCancelSystemInstructions = () => {
    setSystemInstructions(originalSystemInstructions);
    setIsSystemInstructionsReadOnly(true);
  };

  const handleMessageSend = async (message: string) => {
    const userMessage: MessageProps = {
      id: getId(),
      role: 'user',
      content: message,
      name: 'User',
      avatar: userAvatar,
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsMessageSendButtonDisabled(true);

    try {
      if (!modelId || !selectedSourceSettings) {
        throw new Error(ERROR_MESSAGES.NO_MODEL_OR_SOURCE);
      }

      const query: Query = {
        content: message,
        vector_db_ids: [selectedSourceSettings.vectorDB],
        query_config: {
          chunk_template: QUERY_CONFIG.CHUNK_TEMPLATE,
          max_chunks: QUERY_CONFIG.MAX_CHUNKS,
          max_tokens_in_context: QUERY_CONFIG.MAX_TOKENS_IN_CONTEXT,
        },
        llm_model_id: modelId,
        sampling_params: {
          strategy: {
            type: SAMPLING_STRATEGY.TYPE,
          },
          max_tokens: QUERY_CONFIG.MAX_TOKENS,
        },
      };

      const response = await querySource(query);

      const botMessage: MessageProps = {
        id: getId(),
        role: 'bot',
        content: response.chat_completion.completion_message.content || 'No response received',
        name: 'Bot',
        avatar: botAvatar,
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch {
      const botMessage: MessageProps = {
        id: getId(),
        role: 'bot',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        name: 'Bot',
        avatar: botAvatar,
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } finally {
      setIsMessageSendButtonDisabled(false);
    }
  };

  const handleAccordionToggle = (id: string) => {
    if (expandedAccordionItems.includes(id)) {
      setExpandedAccordionItems((currentExpanded) =>
        currentExpanded.filter((itemId) => itemId !== id),
      );
    } else {
      setExpandedAccordionItems((currentExpanded) => [...currentExpanded, id]);
    }
  };

  const settingsPanelContent = (
    <ChatbotSettingsPanel
      expandedAccordionItems={expandedAccordionItems}
      onAccordionToggle={handleAccordionToggle}
      models={models}
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      systemInstructions={systemInstructions}
      onSystemInstructionsChange={setSystemInstructions}
      isSystemInstructionsReadOnly={isSystemInstructionsReadOnly}
      onEditSystemInstructions={handleEditSystemInstructions}
      onSaveSystemInstructions={handleSaveSystemInstructions}
      onCancelSystemInstructions={handleCancelSystemInstructions}
      successAlert={successAlert}
      errorAlert={errorAlert}
      onSourceDrop={handleSourceDrop}
      selectedSource={selectedSource}
      selectedSourceSettings={selectedSourceSettings}
      onRemoveUploadedSource={removeUploadedSource}
      onSetSelectedSourceSettings={setSelectedSourceSettings}
    />
  );

  return (
    <>
      {isSourceSettingsOpen && (
        <ChatbotSourceSettingsModal
          onToggle={() => setIsSourceSettingsOpen(!isSourceSettingsOpen)}
          onSubmitSettings={handleSourceSettingsSubmit}
        />
      )}
      <Drawer isExpanded isInline position="right">
        <DrawerContent panelContent={settingsPanelContent}>
          <DrawerContentBody
            style={{ overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <Chatbot displayMode={displayMode} data-testid="chatbot">
              <ChatbotHeader>
                <ChatbotHeaderMain>
                  <ChatbotHeaderTitle>
                    <Title headingLevel="h1" size="lg">
                      AI playground
                    </Title>
                  </ChatbotHeaderTitle>
                </ChatbotHeaderMain>
              </ChatbotHeader>
              <ChatbotContent>
                <MessageBox position="bottom">
                  <ChatbotWelcomePrompt
                    title="Hello"
                    description="Welcome to the chat playground"
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
                <ChatbotFootnote {...{ label: 'Bot uses AI. Check for mistakes.' }} />
              </ChatbotFooter>
            </Chatbot>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export { ChatbotMain };
