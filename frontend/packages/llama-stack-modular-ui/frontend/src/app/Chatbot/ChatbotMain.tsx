/* eslint-disable no-relative-import-paths/no-relative-import-paths */
/* eslint-disable camelcase */
import * as React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionContent,
  AccordionToggle,
  Alert,
  AlertActionCloseButton,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DropEvent,
  Spinner,
  Title,
  DrawerPanelContent,
  DrawerPanelBody,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Button,
  ButtonVariant,
  Divider,
  TextArea,
  Stack,
  Flex,
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
import { getId } from '@app/utilities/utils';
import { ChatbotMessages } from './ChatbotMessagesList';
import { ChatbotSourceSettingsModal } from './sourceUpload/ChatbotSourceSettingsModal';
import { ChatbotSourceUploadPanel } from './sourceUpload/ChatbotSourceUploadPanel';
import userAvatar from '../bgimages/user_avatar.svg';
import botAvatar from '../bgimages/bot_avatar.svg';
import { extractTextFromFile } from '../utilities/extractPdfText';
import useFetchLlamaModels from '../../../src/app/hooks/useFetchLlamaModels';
import { uploadSource, querySource } from '../services/llamaStackService';
import { ChatbotSourceSettings, Query } from '../types';
import '@patternfly/chatbot/dist/css/main.css';

const initialBotMessage: MessageProps = {
  id: getId(),
  role: 'bot',
  content: 'Send a message to test your configuration',
  name: 'Bot',
  avatar: botAvatar,
};

const ChatbotMain: React.FunctionComponent = () => {
  const [alertKey, setAlertKey] = React.useState<number>(0);
  const displayMode = ChatbotDisplayMode.fullscreen;
  const { models, loading, error, fetchLlamaModels } = useFetchLlamaModels();
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [isSourceSettingsOpen, setIsSourceSettingsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage]);
  const [selectedSource, setSelectedSource] = React.useState<File[]>([]);
  const [selectedSourceSettings, setSelectedSourceSettings] =
    React.useState<ChatbotSourceSettings | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = React.useState(false);
  const [showErrorAlert, setShowErrorAlert] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const [expandedAccordionItems, setExpandedAccordionItems] = React.useState<string[]>([
    'model-details-item',
  ]);
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

  const errorAlert = showErrorAlert ? (
    <Alert
      key={`source-upload-error-${alertKey}`}
      isInline
      variant="danger"
      title="Failed to upload source"
      timeout={4000}
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
        throw new Error('No model or source settings selected');
      }

      const query: Query = {
        content: message,
        vector_db_ids: [selectedSourceSettings.vectorDB],
        query_config: {
          chunk_template: 'Result {index}\nContent: {chunk.content}\nMetadata: {metadata}\n',
          max_chunks: 5,
          max_tokens_in_context: 1000,
        },
        llm_model_id: modelId,
        sampling_params: {
          strategy: {
            type: 'greedy',
          },
          max_tokens: 500,
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
    <DrawerPanelContent isResizable defaultSize="400px" minSize="300px">
      <DrawerPanelBody>
        <Accordion asDefinitionList={false}>
          {/* Model Details Accordion Item */}
          <AccordionItem isExpanded={expandedAccordionItems.includes('model-details-item')}>
            <AccordionToggle
              onClick={() => handleAccordionToggle('model-details-item')}
              id="model-details-item"
            >
              <Title headingLevel="h1" size="lg">
                {' '}
                Model details{' '}
              </Title>
            </AccordionToggle>
            <AccordionContent id="model-details-content" className="pf-v6-u-p-md">
              <Form>
                <FormGroup label="Model" fieldId="model-select">
                  <FormSelect
                    value={selectedModel}
                    onChange={(_event, value) => setSelectedModel(value)}
                    aria-label="Select Model"
                    isDisabled={models.length === 0}
                  >
                    {models.length === 0 ? (
                      <FormSelectOption
                        key="no-models"
                        value=""
                        label="No models available"
                        isDisabled
                      />
                    ) : (
                      <>
                        <FormSelectOption key="select" value="" label="Select a model" isDisabled />
                        {models.map((model, index) => (
                          <FormSelectOption
                            key={index + 1}
                            value={model.identifier}
                            label={model.identifier}
                          />
                        ))}
                      </>
                    )}
                  </FormSelect>
                </FormGroup>
                <FormGroup label="System instructions" fieldId="system-instructions">
                  <Stack hasGutter>
                    <TextArea
                      id="system-instructions-input"
                      type="text"
                      value={systemInstructions}
                      onChange={(_event, value) => setSystemInstructions(value)}
                      aria-label="System instructions input"
                      {...(isSystemInstructionsReadOnly && { readOnlyVariant: 'default' })}
                      rows={8}
                    />
                    {isSystemInstructionsReadOnly ? (
                      <Button
                        variant={ButtonVariant.secondary}
                        aria-label="Edit system instructions"
                        onClick={handleEditSystemInstructions}
                        style={{ marginTop: 'var(--pf-t--global--spacer--sm)', width: '100%' }}
                      >
                        Edit
                      </Button>
                    ) : (
                      <Flex
                        gap={{ default: 'gapMd' }}
                        style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }}
                      >
                        <Button
                          variant={ButtonVariant.secondary}
                          aria-label="Save system instructions"
                          onClick={handleSaveSystemInstructions}
                          style={{ flex: 1 }}
                        >
                          Save
                        </Button>
                        <Button
                          variant={ButtonVariant.secondary}
                          aria-label="Cancel editing system instructions"
                          onClick={handleCancelSystemInstructions}
                          style={{ flex: 1 }}
                        >
                          Cancel
                        </Button>
                      </Flex>
                    )}
                  </Stack>
                </FormGroup>
              </Form>
            </AccordionContent>
          </AccordionItem>
          <Divider />
          {/* Sources Accordion Item */}
          <AccordionItem isExpanded={expandedAccordionItems.includes('sources-item')}>
            <AccordionToggle
              onClick={() => handleAccordionToggle('sources-item')}
              id="sources-item"
            >
              {' '}
              <Title headingLevel="h1" size="lg">
                {' '}
                Sources{' '}
              </Title>{' '}
            </AccordionToggle>
            <AccordionContent id="sources-content" className="pf-v6-u-p-md">
              <Form>
                <FormGroup fieldId="sources">
                  <ChatbotSourceUploadPanel
                    successAlert={successAlert}
                    errorAlert={errorAlert}
                    handleSourceDrop={handleSourceDrop}
                    selectedSource={selectedSource}
                    selectedSourceSettings={selectedSourceSettings}
                    removeUploadedSource={removeUploadedSource}
                    setSelectedSourceSettings={setSelectedSourceSettings}
                  />
                </FormGroup>
              </Form>
            </AccordionContent>
          </AccordionItem>
          <Divider />
          {/* MCP Servers Accordion Item */}
          <AccordionItem isExpanded={expandedAccordionItems.includes('mcp-servers-item')}>
            <AccordionToggle
              onClick={() => handleAccordionToggle('mcp-servers-item')}
              id="mcp-servers-item"
            >
              {' '}
              <Title headingLevel="h1" size="lg">
                {' '}
                MCP servers{' '}
              </Title>{' '}
            </AccordionToggle>
            <AccordionContent id="mcp-servers-content" className="pf-v6-u-p-md">
              <Form>
                <FormGroup fieldId="mcpServers">
                  <Title headingLevel="h2" size="md">
                    List of mcp servers
                  </Title>
                </FormGroup>
              </Form>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DrawerPanelBody>
    </DrawerPanelContent>
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
