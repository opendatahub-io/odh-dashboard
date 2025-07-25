/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';
import {
  Chatbot,
  ChatbotContent,
  ChatbotDisplayMode,
  ChatbotFooter,
  ChatbotFootnote,
  ChatbotHeader,
  ChatbotHeaderActions,
  ChatbotHeaderMain,
  ChatbotHeaderTitle,
  ChatbotWelcomePrompt,
  MessageBar,
  MessageBox,
  MessageProps,
} from '@patternfly/chatbot';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DropEvent,
  Label,
  Select,
  SelectOption,
  Spinner,
  Title,
} from '@patternfly/react-core';
import '@patternfly/chatbot/dist/css/main.css';
import { ShareSquareIcon } from '@patternfly/react-icons';
import { getId } from '~/src/app/utilities/utils';
import useFetchLlamaModels from '~/src/app/utilities/useFetchLlamaModels';
import { CHAT_COMPLETION_URL } from '@app/services/llamaStackService';
import { authService } from '@app/services/authService';
import botAvatar from '@app/bgimages/bot_avatar.svg';
import userAvatar from '@app/bgimages/user_avatar.svg';
import { ChatbotMessages } from './ChatbotMessagesList';
import { ChatbotShareModal } from './ChatbotShareModal';
import {
  ChatbotSourceSettings,
  ChatbotSourceSettingsModal,
} from './sourceUpload/ChatbotSourceSettingsModal';
import { ChatbotSourceUploadPanel } from './sourceUpload/ChatbotSourceUploadPanel';

// TypeScript interfaces for stream event processing
type StreamEventDelta = {
  text?: string;
};

type StreamEvent = {
  event_type: 'progress' | 'complete' | 'error';
  delta?: StreamEventDelta;
  message?: string;
  error?: string;
};

type StreamEventWrapper = {
  event?: StreamEvent;
};

// Type guards for runtime validation
const isValidStreamEventWrapper = (obj: unknown): obj is StreamEventWrapper =>
  typeof obj === 'object' && obj !== null;

const isValidStreamEvent = (event: unknown): event is StreamEvent => {
  if (typeof event !== 'object' || event === null) {
    // eslint-disable-next-line no-console
    console.warn('[ChatBot] Stream event validation failed: not an object or null', event);
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const e = event as Record<string, unknown>;

  if (typeof e.event_type !== 'string') {
    // eslint-disable-next-line no-console
    console.warn('[ChatBot] Stream event validation failed: event_type is not a string', {
      event_type: e.event_type,
      typeof_event_type: typeof e.event_type,
      full_event: event,
    });
    return false;
  }

  if (!['progress', 'complete', 'error'].includes(e.event_type)) {
    // eslint-disable-next-line no-console
    console.warn('[ChatBot] Stream event validation failed: unknown event_type', {
      event_type: e.event_type,
      valid_types: ['progress', 'complete', 'error'],
      full_event: event,
    });
    return false;
  }

  return true;
};

const isProgressEvent = (event: StreamEvent): event is StreamEvent & { event_type: 'progress' } =>
  event.event_type === 'progress';

const isCompleteEvent = (event: StreamEvent): event is StreamEvent & { event_type: 'complete' } =>
  event.event_type === 'complete';

const isErrorEvent = (event: StreamEvent): event is StreamEvent & { event_type: 'error' } =>
  event.event_type === 'error';

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
  const typingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [selectedModelId, setSelectedModelId] = React.useState<string | undefined>(undefined);
  const [isModelSelectOpen, setIsModelSelectOpen] = React.useState(false);
  const { models, loading, error, fetchLlamaModels } = useFetchLlamaModels();
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [isShareChatbotOpen, setIsShareChatbotOpen] = React.useState(false);
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
    fetchLlamaModels();

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  React.useEffect(() => {
    if (models.length && !selectedModelId) {
      setSelectedModelId(models[0].identifier);
    }
  }, [models, selectedModelId]);

  React.useEffect(() => {
    if (selectedSource.length > 0) {
      setIsSourceSettingsOpen(true);
    }
  }, [selectedSource]);

  if (loading) {
    return <Spinner size="sm" />;
  }

  // TODO: Uncomment this when the backend is ready
  // if (error) {
  //   return <Alert variant="warning" isInline title="Cannot fetch models">{error}</Alert>;
  // }

  const handleSourceDrop = (event: DropEvent, source: File[]) => {
    setSelectedSource(source);
    setSelectedSourceSettings(null);
  };

  const removeUploadedSource = (sourceName: string) => {
    setSelectedSource((sources) => sources.filter((f) => f.name !== sourceName));
  };

  const handleModelSelect = (
    event: React.MouseEvent | React.KeyboardEvent | undefined,
    value: string,
  ) => {
    setSelectedModelId(value);
    setIsModelSelectOpen(false);
  };

  const showAlert = () => {
    setAlertKey((key) => key + 1);
    setShowSuccessAlert(true);
  };

  const handleMessageSend = async (userInput: string) => {
    // Validate user input
    if (!userInput || userInput.trim().length === 0) {
      return;
    }

    // Validate model selection
    if (!selectedModelId) {
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
    const assistantMessageId = getId();

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'bot',
        content: '',
        name: 'Bot',
        avatar: botAvatar,
      },
    ]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Get authentication token
      const token = authService.getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(CHAT_COMPLETION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: updatedMessages.map((msg) => {
            const isAssistant = msg.role === 'bot';
            return {
              role: isAssistant ? 'assistant' : 'user',
              content: msg.content ?? '',
              ...(isAssistant ? { stop_reason: 'end_of_message' } : {}),
            };
          }),
          model_id: selectedModelId,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      let assistantContent = '';
      let streamEnded = false;

      const typingQueue: string[] = [];
      const startTyping = () => {
        if (typingIntervalRef.current) {
          return;
        }

        typingIntervalRef.current = setInterval(() => {
          if (typingQueue.length > 0) {
            const nextChar = typingQueue.shift()!;
            assistantContent += nextChar;
            setMessages((prev) =>
              prev.map((msg) =>
                // eslint-disable-next-line prefer-template
                msg.id === assistantMessageId ? { ...msg, content: assistantContent + '▌' } : msg,
              ),
            );
          } else if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
        }, 10);
      };

      const processStreamEvent = (jsonStr: string): void => {
        try {
          // Parse JSON with type safety
          const parsed: unknown = JSON.parse(jsonStr);

          // Validate top-level structure
          if (!isValidStreamEventWrapper(parsed)) {
            // eslint-disable-next-line no-console
            console.warn(
              '[ChatBot] Invalid stream event wrapper structure, skipping event. Expected object with event field, got:',
              parsed,
            );
            return;
          }

          // Check for event field
          if (!parsed.event) {
            // eslint-disable-next-line no-console
            console.warn(
              '[ChatBot] Stream event missing event field, skipping. Full structure:',
              parsed,
            );
            return;
          }

          // Validate event structure
          if (!isValidStreamEvent(parsed.event)) {
            // eslint-disable-next-line no-console
            console.warn(
              '[ChatBot] Invalid stream event structure, skipping event. Raw event:',
              parsed.event,
            );
            return;
          }

          const { event } = parsed;

          // Process different event types with proper validation
          if (isProgressEvent(event)) {
            // Handle progress events
            if (event.delta?.text && typeof event.delta.text === 'string') {
              const deltaText = event.delta.text;
              if (deltaText.length > 0) {
                typingQueue.push(...deltaText.split(''));
                startTyping();
              }
            } else {
              // Progress event without text is valid but no-op
              // eslint-disable-next-line no-console
              console.debug('[ChatBot] Progress event received without text content');
            }
          } else if (isCompleteEvent(event)) {
            // Handle completion events
            streamEnded = true;
            // console.debug('[ChatBot] Stream completion event received');

            const finalize = (): void => {
              if (typingQueue.length > 0) {
                // Wait for typing animation to complete
                setTimeout(finalize, 20);
              } else {
                // Remove typing indicator and finalize message

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg,
                  ),
                );
              }
            };
            finalize();
          } else if (isErrorEvent(event)) {
            // Handle error events from stream
            const errorMessage = event.error || event.message || 'Unknown stream error';
            // eslint-disable-next-line no-console
            console.error('[ChatBot] Stream error event received:', errorMessage);

            // Display error to user
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: `Error during response generation: ${errorMessage}`,
                    }
                  : msg,
              ),
            );
            streamEnded = true;
          } else {
            // Handle unknown event types gracefully
            // eslint-disable-next-line no-console
            console.warn(`[ChatBot] Unknown stream event type: ${event.event_type}, ignoring`);
          }
        } catch (err) {
          // Enhanced error handling for JSON parsing
          if (err instanceof SyntaxError) {
            // eslint-disable-next-line no-console
            console.warn(
              '[ChatBot] Failed to parse stream event JSON:',
              err.message,
              'Raw JSON:',
              jsonStr,
            );
          } else if (err instanceof Error) {
            // eslint-disable-next-line no-console
            console.warn(
              '[ChatBot] Error processing stream event:',
              err.message,
              'Raw JSON:',
              jsonStr,
            );
          } else {
            // eslint-disable-next-line no-console
            console.warn(
              '[ChatBot] Unknown error processing stream event:',
              err,
              'Raw JSON:',
              jsonStr,
            );
          }

          // Don't break the stream for individual event parsing errors
          // The stream will continue processing other events
        }
      };

      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (!done && !streamEnded) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data:')) {
                const jsonStr = trimmed.replace(/^data:\s*/, '');
                if (jsonStr) {
                  processStreamEvent(jsonStr);
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
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
      clearTimeout(timeoutId);
      setIsMessageSendButtonDisabled(false);
    }
  };

  const handleSourceSettingsSubmit = (settings: ChatbotSourceSettings | null) => {
    setSelectedSourceSettings(settings);
    setIsSourceSettingsOpen(!isSourceSettingsOpen);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (settings?.chunkOverlap && settings?.maxChunkLength) {
      showAlert();
    } else {
      setSelectedSource([]);
    }
  };

  return (
    <>
      {isShareChatbotOpen && (
        <ChatbotShareModal onToggle={() => setIsShareChatbotOpen(!isShareChatbotOpen)} />
      )}
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
                      style={{ marginLeft: 'var(--pf-t--global--spacer--md)' }}
                    >
                      {selectedModelId}
                    </Label>
                    <Select
                      variant="default"
                      aria-label="Select Model"
                      onOpenChange={setIsModelSelectOpen}
                      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                      onSelect={(event, value) => handleModelSelect(event, value as string)}
                      selected={selectedModelId}
                      isOpen={isModelSelectOpen}
                      data-testid="model-select"
                      toggle={{
                        toggleNode: (
                          <Button
                            variant="secondary"
                            aria-label="Select Model Toggle"
                            className="pf-v6-u-w-25"
                            style={{ marginLeft: 'var(--pf-t--global--spacer--md)' }}
                            data-testid="model-select-toggle"
                          >
                            {selectedModelId || 'Select model'}
                          </Button>
                        ),
                      }}
                    >
                      {Array.isArray(models) &&
                        models.map((model) => (
                          <SelectOption key={model.identifier} value={model.identifier}>
                            {model.identifier}
                          </SelectOption>
                        ))}
                    </Select>
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
