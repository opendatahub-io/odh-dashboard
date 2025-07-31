/* eslint-disable no-relative-import-paths/no-relative-import-paths */
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
  InputGroup,
  TextInput,
  Button,
  Split,
  SplitItem,
  ButtonVariant,
  SliderOnChangeEvent,
  Slider,
  Divider,
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
import { CheckIcon, PencilAltIcon, TimesIcon } from '@patternfly/react-icons';
import useFetchLlamaModels from '@app/utilities/useFetchLlamaModels';
import { ChatMessage, completeChat, LlamaModel } from '@app/services/llamaStackService';
import { getId } from '@app/utilities/utils';
import { ChatbotMessages } from './ChatbotMessagesList';
import {
  ChatbotSourceSettings,
  ChatbotSourceSettingsModal,
} from './sourceUpload/ChatbotSourceSettingsModal';
import { ChatbotSourceUploadPanel } from './sourceUpload/ChatbotSourceUploadPanel';
import userAvatar from '../bgimages/user_avatar.svg';
import botAvatar from '../bgimages/bot_avatar.svg';
import '@patternfly/chatbot/dist/css/main.css';

const initialBotMessage: MessageProps = {
  id: getId(),
  role: 'bot',
  content: 'Send a message to test your configuration',
  name: 'Bot',
  avatar: botAvatar,
};

const createSliderGroup = (
  id: string,
  label: string,
  value: number,
  inputValue: number,
  setValue: (value: number) => void,
  setInputValue: (value: number) => void,
  min = 0,
  max = 100,
) => {
  const handleSliderChange = (
    _event: SliderOnChangeEvent,
    newValue: number,
    newInputValue?: number,
  ) => {
    const finalValue = typeof newInputValue === 'number' ? newInputValue : newValue;
    const clampedValue = Math.max(min, Math.min(max, finalValue));
    setValue(clampedValue);
    setInputValue(clampedValue);
  };

  return (
    <FormGroup label={label} fieldId={id}>
      <Slider
        isInputVisible
        showBoundaries={false}
        value={value}
        inputValue={inputValue}
        min={min}
        max={max}
        onChange={handleSliderChange}
      />
    </FormGroup>
  );
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
  const [showPopover, setShowPopover] = React.useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const [expandedAccordionItems, setExpandedAccordionItems] = React.useState<string[]>([
    'model-details-item',
  ]);
  const [systemInstructions, setSystemInstructions] = React.useState('');
  const [isSystemInstructionsReadOnly, setIsSystemInstructionsReadOnly] = React.useState(true);
  const [originalSystemInstructions, setOriginalSystemInstructions] =
    React.useState(systemInstructions);
  const [slider1Value, setSlider1Value] = React.useState(10);
  const [slider1InputValue, setSlider1InputValue] = React.useState(10);
  const [slider2Value, setSlider2Value] = React.useState(40);
  const [slider2InputValue, setSlider2InputValue] = React.useState(40);
  const [slider3Value, setSlider3Value] = React.useState(30);
  const [slider3InputValue, setSlider3InputValue] = React.useState(30);
  const [slider4Value, setSlider4Value] = React.useState(90);
  const [slider4InputValue, setSlider4InputValue] = React.useState(90);
  const [selectedModel, setSelectedModel] = React.useState<string>('');

  const modelsList: LlamaModel[] = React.useMemo(() => {
    if (Array.isArray(models)) {
      return models;
    }
    return [];
  }, [models]);

  const modelId = selectedModel || modelsList[0]?.identifier;

  const footnoteProps = {
    label: 'Bot uses AI. Check for mistakes.',
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
    if (modelsList.length > 0 && !selectedModel) {
      setSelectedModel(modelsList[0].identifier);
    }
  }, [modelsList, selectedModel]);

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

  const handleSourceDrop = (event: DropEvent, source: File[]) => {
    setSelectedSource(source);
    setSelectedSourceSettings(null);
  };

  const removeUploadedSource = (sourceName: string) => {
    setSelectedSource((sources) => sources.filter((f) => f.name !== sourceName));
  };

  const handleMessageSend = async (userInput: string) => {
    if (!userInput) {
      return;
    }

    if (!modelId) {
      setMessages((prev) => [
        ...prev,
        {
          id: getId(),
          role: 'bot',
          content: 'Please select a model before sending a message.',
          name: 'Bot',
          avatar: botAvatar,
        },
      ]);
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

    if (settings && settings.chunkOverlap && settings.maxChunkLength) {
      showAlert();
    } else {
      setSelectedSource([]);
    }
  };

  const handleEditSystemInstructions = () => {
    setOriginalSystemInstructions(systemInstructions);
    setIsSystemInstructionsReadOnly(false);
  };

  const handleSaveSystemInstructions = () => {
    setIsSystemInstructionsReadOnly(true);
    // Optional: Trigger API call or other action to persist the change
  };

  const handleCancelSystemInstructions = () => {
    setSystemInstructions(originalSystemInstructions);
    setIsSystemInstructionsReadOnly(true);
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
                <FormGroup label="Model" fieldId="model-select" isRequired>
                  <FormSelect
                    value={selectedModel}
                    onChange={(_event, value) => setSelectedModel(value)}
                    aria-label="Select Model"
                    isDisabled={modelsList.length === 0}
                  >
                    {modelsList.length === 0 ? (
                      <FormSelectOption
                        key="no-models"
                        value=""
                        label="No models available"
                        isDisabled
                      />
                    ) : (
                      <>
                        <FormSelectOption key="select" value="" label="Select a model" isDisabled />
                        {modelsList.map((model, index) => (
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
                  <InputGroup>
                    <TextInput
                      id="system-instructions-input"
                      type="text"
                      value={systemInstructions}
                      onChange={(_event, value) => setSystemInstructions(value)}
                      aria-label="System instructions input"
                      {...(isSystemInstructionsReadOnly && { readOnlyVariant: 'default' })}
                    />
                    {isSystemInstructionsReadOnly ? (
                      <Button
                        variant={ButtonVariant.plain}
                        aria-label="Edit system instructions"
                        onClick={handleEditSystemInstructions}
                      >
                        {' '}
                        <PencilAltIcon />{' '}
                      </Button>
                    ) : (
                      <Split>
                        <SplitItem>
                          <Button
                            variant={ButtonVariant.plain}
                            aria-label="Save system instructions"
                            onClick={handleSaveSystemInstructions}
                          >
                            <CheckIcon />
                          </Button>
                        </SplitItem>
                        <SplitItem>
                          <Button
                            variant={ButtonVariant.plain}
                            aria-label="Cancel editing system instructions"
                            onClick={handleCancelSystemInstructions}
                          >
                            {' '}
                            <TimesIcon />{' '}
                          </Button>
                        </SplitItem>
                      </Split>
                    )}
                  </InputGroup>
                </FormGroup>
                {createSliderGroup(
                  'slider-1',
                  'Temperature',
                  slider1Value,
                  slider1InputValue,
                  setSlider1Value,
                  setSlider1InputValue,
                )}
                {createSliderGroup(
                  'slider-2',
                  'Top P',
                  slider2Value,
                  slider2InputValue,
                  setSlider2Value,
                  setSlider2InputValue,
                )}
                {createSliderGroup(
                  'slider-3',
                  'Max Token',
                  slider3Value,
                  slider3InputValue,
                  setSlider3Value,
                  setSlider3InputValue,
                )}
                {createSliderGroup(
                  'slider-4',
                  'Repetition',
                  slider4Value,
                  slider4InputValue,
                  setSlider4Value,
                  setSlider4InputValue,
                )}
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
                    alert={successAlert}
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
