/* eslint-disable camelcase */
import * as React from 'react';
import { MessageProps, ToolResponseProps } from '@patternfly/chatbot';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import userAvatar from '~/app/bgimages/user_avatar.svg';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { getId, getLlamaModelDisplayName, splitLlamaModelId } from '~/app/utilities/utils';
import {
  ApiError,
  ChatMessageRole,
  CreateResponseRequest,
  GuardrailInlineConfig,
  isApiError,
  MCPToolCallData,
  MCPServerFromAPI,
  ResponseMetrics,
  TokenInfo,
  ClassifiedError,
} from '~/app/types';
import {
  ERROR_MESSAGES,
  GUARDRAIL_ERROR_CODES,
  GUARDRAIL_INPUT_PROMPT,
  GUARDRAIL_OUTPUT_PROMPT,
  GUARDRAIL_MESSAGES,
} from '~/app/Chatbot/const';
import { getSelectedServersForAPI } from '~/app/utilities/mcp';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import { classifyError } from '~/app/utilities/errorClassifier';
import { findMockScenario } from '~/app/utilities/mockErrors';

import {
  ToolResponseCardTitle,
  ToolResponseCardBody,
} from '~/app/Chatbot/ChatbotMessagesToolResponse';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { useChatbotConfigStore } from '~/app/Chatbot/store';

export type GuardrailsConfig = {
  enabled: boolean;
  guardrail: string;
  userInputEnabled: boolean;
  modelOutputEnabled: boolean;
  guardrailSubscription: string;
};

// Extended message type that includes metrics data for display
export type ChatbotMessageProps = MessageProps & {
  metrics?: ResponseMetrics;
  errorClassification?: ClassifiedError;
  onRetryError?: () => void;
};

export interface UseChatbotMessagesReturn {
  messages: ChatbotMessageProps[];
  isMessageSendButtonDisabled: boolean;
  isLoading: boolean;
  isStreamingWithoutContent: boolean;
  handleMessageSend: (message: string, compareID?: string) => Promise<void>;
  handleStopStreaming: () => void;
  clearConversation: () => void;
  scrollToBottomRef: React.RefObject<HTMLDivElement>;
  /** Metrics from the last bot response (latency, tokens, TTFT) */
  lastResponseMetrics: ResponseMetrics | null;
  /** Display name of the selected model (for showing in message headers) */
  modelDisplayName: string;
}

interface UseChatbotMessagesProps {
  configId: string;
  modelId: string;
  systemInstruction: string;
  isRawUploaded: boolean;
  username?: string;
  isStreamingEnabled: boolean;
  temperature: number;
  currentVectorStoreId: string | null;
  selectedServerIds: string[];
  // MCP data as props (instead of contexts)
  mcpServers: MCPServerFromAPI[];
  mcpServerStatuses: Map<string, ServerStatusInfo>;
  mcpServerTokens: Map<string, TokenInfo>;
  toolSelections?: (ns: string, url: string) => string[] | undefined;
  namespace?: string;
  // Guardrails configuration
  guardrailsConfig?: GuardrailsConfig;
  // MaaS subscription name for API key generation
  subscription?: string;
  // Compare-mode analytics
  configIndex?: number;
  isCompareMode?: boolean;
  isGuardrailEnabled?: boolean;
  promptVersion?: number;
  promptName?: string;
}

const useChatbotMessages = ({
  configId,
  modelId,
  systemInstruction,
  isRawUploaded,
  username,
  isStreamingEnabled,
  temperature,
  currentVectorStoreId,
  selectedServerIds,
  mcpServers,
  mcpServerStatuses,
  mcpServerTokens,
  toolSelections,
  namespace,
  guardrailsConfig,
  subscription,
  configIndex,
  isCompareMode,
  isGuardrailEnabled,
  promptVersion,
  promptName,
}: UseChatbotMessagesProps): UseChatbotMessagesReturn => {
  const [messages, setMessages] = React.useState<ChatbotMessageProps[]>([]);
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Track whether streaming content has been received (avoids stale messages in error handler)
  const streamingReceivedRef = React.useRef(false);
  const [isStreamingWithoutContent, setIsStreamingWithoutContent] = React.useState(false);
  const [lastResponseMetrics, setLastResponseMetrics] = React.useState<ResponseMetrics | null>(
    null,
  );
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const isStoppingStreamRef = React.useRef<boolean>(false);
  const isClearingRef = React.useRef<boolean>(false);
  // Keep messages in a ref for handleRetry to access latest state
  const messagesRef = React.useRef<ChatbotMessageProps[]>(messages);
  // Keep handleMessageSend in a ref for handleRetry to access latest function
  const handleMessageSendRef = React.useRef<
    ((message: string, compareID?: string) => Promise<void>) | null
  >(null);
  // Keep bot message ID in a ref for handleRetry to access latest value
  const botMessageIdRef = React.useRef<string | undefined>(undefined);
  const { api, apiAvailable } = useGenAiAPI();
  const { aiModels } = React.useContext(ChatbotContext);

  const modelDisplayName = React.useMemo(
    () => (modelId ? getLlamaModelDisplayName(modelId, aiModels) || modelId : 'Bot'),
    [modelId, aiModels],
  );

  const getSelectedServersForAPICallback = React.useCallback(
    () =>
      getSelectedServersForAPI(
        selectedServerIds,
        mcpServers,
        mcpServerStatuses,
        mcpServerTokens,
        toolSelections,
        namespace,
      ),
    [selectedServerIds, mcpServers, mcpServerStatuses, mcpServerTokens, toolSelections, namespace],
  );

  // Build the inline guardrail_config object from the current guardrails selection.
  // Prompt presence drives enablement — no separate boolean flags needed.
  const buildGuardrailConfig = React.useCallback((): GuardrailInlineConfig | undefined => {
    if (!guardrailsConfig?.enabled || !guardrailsConfig.guardrail) {
      return undefined;
    }

    const { userInputEnabled, modelOutputEnabled } = guardrailsConfig;

    // Don't send guardrail_config when both toggles are off
    if (!userInputEnabled && !modelOutputEnabled) {
      return undefined;
    }

    const { providerId, id: baseGuardrailModelId } = splitLlamaModelId(guardrailsConfig.guardrail);
    const isMaaS = providerId.startsWith('maas-');

    // Resolve model_source_type the same way as the main model: look up in aiModels
    const guardrailAIModel = aiModels.find((m) => m.model_id === baseGuardrailModelId);
    const guardrailSourceType = isMaaS
      ? 'maas'
      : (guardrailAIModel?.model_source_type ?? 'namespace');

    const config: GuardrailInlineConfig = {
      guardrail_model: guardrailsConfig.guardrail,
      guardrail_model_source_type: guardrailSourceType,
      ...(userInputEnabled && { input_prompt: GUARDRAIL_INPUT_PROMPT }),
      ...(modelOutputEnabled && { output_prompt: GUARDRAIL_OUTPUT_PROMPT }),
    };

    if (isMaaS && guardrailsConfig.guardrailSubscription) {
      config.guardrail_subscription = guardrailsConfig.guardrailSubscription;
    }

    return config;
  }, [guardrailsConfig, aiModels]);

  // Cleanup timeout and abort controller on unmount
  React.useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
    [],
  );

  // Sync messagesRef with messages state for handleRetry
  React.useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Sync handleMessageSendRef with handleMessageSend function for handleRetry
  // This ensures the ref is always set, even if handleMessageSend is never called
  React.useEffect(() => {
    handleMessageSendRef.current = handleMessageSend;
  });

  // Update initial message name with the initially selected model (runs once on mount)
  React.useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].role === 'bot' && prev[0].name !== modelDisplayName
        ? [{ ...prev[0], name: modelDisplayName }]
        : prev,
    );
  }, [modelDisplayName]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Create tool response from MCP tool call data
  const createToolResponse = React.useCallback(
    (toolCallData: MCPToolCallData): ToolResponseProps => {
      const { serverLabel, toolName, toolArguments, toolOutput } = toolCallData;

      return {
        isDefaultExpanded: false,
        toggleContent: `Tool response: ${toolName}`,
        subheading: `${serverLabel}`,
        body: `Here's the summary for your ${toolName} response:`,
        cardTitle: React.createElement(ToolResponseCardTitle, { toolName }),
        cardBody: React.createElement(ToolResponseCardBody, { toolArguments, toolOutput }),
      };
    },
    [],
  );

  const handleStopStreaming = React.useCallback(() => {
    if (abortControllerRef.current) {
      isStoppingStreamRef.current = true;

      // Track stop button click
      fireMiscTrackingEvent('Playground Query Stopped', {
        isStreaming: isStreamingEnabled,
        isRag: isRawUploaded,
      });

      // Clear any pending streaming updates to prevent them from overwriting the stop message
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [isStreamingEnabled, isRawUploaded]);

  const clearConversation = React.useCallback(() => {
    // Mark that we're clearing (not just stopping)
    isClearingRef.current = true;

    // Clean up any pending timeouts first
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Abort any ongoing requests without showing stop message
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setMessages([]);
    setIsMessageSendButtonDisabled(false);
    setIsLoading(false);
    setIsStreamingWithoutContent(false);
    setLastResponseMetrics(null);
    isStoppingStreamRef.current = false;

    // Reset clearing flag after state updates complete
    // Use setTimeout to ensure this runs after React finishes all state updates
    setTimeout(() => {
      isClearingRef.current = false;
    }, 0);
  }, []);

  const handleMessageSend = async (message: string, compareID?: string) => {
    // Reset streaming content tracker for new message
    streamingReceivedRef.current = false;

    const userMessage: MessageProps = {
      id: getId(),
      role: 'user',
      content: message,
      name: username || 'User',
      avatar: userAvatar,
      timestamp: new Date().toLocaleString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsMessageSendButtonDisabled(true);
    setIsLoading(true);

    // For streaming, we'll track if we have content separately
    if (isStreamingEnabled) {
      setIsStreamingWithoutContent(true);
    }

    try {
      // Create placeholder bot message FIRST (before any validation that could throw)
      // This ensures error handling can update the message consistently
      botMessageIdRef.current = getId();
      const placeholderBotMessage: MessageProps = {
        id: botMessageIdRef.current,
        role: 'bot',
        content: '',
        name: modelDisplayName,
        avatar: botAvatar,
        isLoading: true,
        timestamp: new Date().toLocaleString(),
      };
      setMessages((prevMessages) => [...prevMessages, placeholderBotMessage]);

      if (!modelId) {
        throw new Error(ERROR_MESSAGES.NO_MODEL_OR_SOURCE);
      }

      const selectedMcpServers = getSelectedServersForAPICallback();

      // Get guardrail config based on user configuration
      const guardrailConfig = buildGuardrailConfig();

      // Find the selected model to get its model_source_type
      // Strip provider prefix from LlamaStack model ID (e.g., "endpoint-1/gpt-4o" → "gpt-4o")
      const { id: baseModelId } = splitLlamaModelId(modelId);
      const selectedModel = aiModels.find((model) => model.model_id === baseModelId);

      const responsesPayload: CreateResponseRequest = {
        input: message,
        model: modelId,
        ...(isRawUploaded &&
          currentVectorStoreId && {
            vector_store_ids: [currentVectorStoreId],
          }),
        chat_context: messages
          .map((msg) => ({
            role:
              msg.role === ChatMessageRole.USER ? ChatMessageRole.USER : ChatMessageRole.ASSISTANT,
            content: msg.content || '',
          }))
          .filter((msg) => msg.content),
        instructions: systemInstruction,
        stream: isStreamingEnabled,
        temperature,
        ...(selectedMcpServers.length > 0 && { mcp_servers: selectedMcpServers }),
        ...(guardrailConfig && { guardrail_config: guardrailConfig }),
        ...(selectedModel?.model_source_type && {
          model_source_type: selectedModel.model_source_type,
        }),
        ...(subscription && { subscription }),
      };

      fireMiscTrackingEvent('Playground Query Submitted', {
        configID: configIndex ?? 0,
        compareMode: isCompareMode ?? false,
        compareID: compareID || '',
        modelName: modelDisplayName,
        guardrailOn: isGuardrailEnabled ?? false,
        isRag: isRawUploaded,
        countofMCP: selectedMcpServers.length,
        isStreaming: isStreamingEnabled,
        promptSource: useChatbotConfigStore.getState().getPromptSourceType(configId),
        promptVersion: promptVersion ?? 0,
        promptName: promptName ?? '',
      });

      if (!apiAvailable) {
        throw new Error('API is not available');
      }

      // Create abort controller for this request (works for both streaming and non-streaming)
      abortControllerRef.current = new AbortController();

      if (isStreamingEnabled) {
        // Handle streaming response with line-by-line display like ChatGPT
        const completeLines: string[] = [];
        let currentPartialLine = '';

        const updateMessage = (showPartialLine = true, hasContent = false) => {
          // Combine complete lines with current partial line for display
          const displayContent =
            completeLines.join('\n') +
            (showPartialLine && currentPartialLine
              ? (completeLines.length > 0 ? '\n' : '') + currentPartialLine
              : '');

          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === botMessageIdRef.current
                ? {
                    ...msg,
                    content: displayContent,
                    isLoading: !hasContent, // Hide loading dots once we have content
                  }
                : msg,
            ),
          );
        };

        // Check for mock error scenarios (MOCK: prefix required) - DEVELOPMENT ONLY
        // Example: type "MOCK:timeout" to trigger a timeout error
        if (process.env.NODE_ENV === 'development') {
          const mockScenario = findMockScenario(message);
          if (mockScenario) {
            // Simulate partial response if provided
            if (mockScenario.partialResponse) {
              // Simulate streaming of partial response
              await new Promise((resolve) => {
                setTimeout(() => {
                  completeLines.push(mockScenario.partialResponse!);
                  updateMessage(true, true);
                  // Mark that streaming content was received for error classification
                  streamingReceivedRef.current = true;
                  resolve(undefined);
                }, 500);
              });
            }

            // Throw the mock error after partial response (or immediately if no partial)
            throw mockScenario.apiError;
          }
        }

        const streamingResponse = await api.createResponse(responsesPayload, {
          abortSignal: abortControllerRef.current.signal,
          onStreamData: (chunk: string, clearPrevious?: boolean) => {
            if (clearPrevious) {
              completeLines.length = 0;
              currentPartialLine = '';
            }

            // Track if we have any content
            const hasAnyContent =
              completeLines.length > 0 || currentPartialLine.length > 0 || chunk.length > 0;

            // On first non-empty chunk, hide loading dots
            if (chunk && isStreamingWithoutContent) {
              setIsStreamingWithoutContent(false);
            }

            // Add chunk to current partial line
            currentPartialLine += chunk;

            // Mark that we've received streaming content (any non-empty chunk counts)
            if (chunk) {
              streamingReceivedRef.current = true;
            }

            // Check if we have complete lines (ending with newline characters)
            const lines = currentPartialLine.split('\n');

            if (lines.length > 1) {
              // We have at least one complete line
              // Add all complete lines except the last one (which might be partial)
              completeLines.push(...lines.slice(0, -1));
              currentPartialLine = lines[lines.length - 1]; // Keep the last line as partial

              // Update immediately when we have a new complete line
              updateMessage(true, hasAnyContent);
            } else {
              // No complete lines yet, just update the partial line
              // Clear previous timeout and set a new one for smooth partial line updates
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }

              // Update UI every 50ms for smooth streaming effect on partial lines
              // Only schedule update if not stopping
              if (!isStoppingStreamRef.current) {
                timeoutRef.current = setTimeout(() => updateMessage(true, hasAnyContent), 50);
              }
            }
          },
        });

        // Final update with processed content (file citations replaced with filenames)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Build sources prop for PatternFly SourcesCard if sources exist
        // Add onClick to prevent link navigation (display only)
        const sourcesProps = streamingResponse.sources?.length
          ? {
              sources: {
                sources: streamingResponse.sources.map((source) => ({
                  ...source,
                  onClick: (e: React.MouseEvent) => e.preventDefault(),
                })),
              },
            }
          : {};

        // Use the processed content from the response which has file citation tokens replaced
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === botMessageIdRef.current
              ? {
                  ...msg,
                  content: streamingResponse.content,
                  isLoading: false,
                  ...sourcesProps,
                }
              : msg,
          ),
        );

        // Add tool response and metrics if available from streaming response
        if (streamingResponse.toolCallData || streamingResponse.metrics) {
          const toolResponse = streamingResponse.toolCallData
            ? createToolResponse(streamingResponse.toolCallData)
            : undefined;
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === botMessageIdRef.current
                ? {
                    ...msg,
                    ...(toolResponse && { toolResponse }),
                    ...(streamingResponse.metrics && { metrics: streamingResponse.metrics }),
                  }
                : msg,
            ),
          );
          // Update last response metrics for pane header display
          if (streamingResponse.metrics) {
            setLastResponseMetrics(streamingResponse.metrics);
          }
        }
      } else {
        // Handle non-streaming response

        // Check for mock error scenarios (MOCK: prefix required) - DEVELOPMENT ONLY
        // Example: type "MOCK:timeout" to trigger a timeout error
        if (process.env.NODE_ENV === 'development') {
          const mockScenario = findMockScenario(message);
          if (mockScenario) {
            // For non-streaming, we don't support partial responses
            // Just throw the error immediately
            throw mockScenario.apiError;
          }
        }

        const response = await api.createResponse(responsesPayload, {
          abortSignal: abortControllerRef.current.signal,
        });

        const toolResponse = response.toolCallData
          ? createToolResponse(response.toolCallData)
          : undefined;

        // Build sources prop for PatternFly SourcesCard if sources exist
        // Add onClick to prevent link navigation (display only)
        const sourcesProps = response.sources?.length
          ? {
              sources: {
                sources: response.sources.map((source) => ({
                  ...source,
                  onClick: (e: React.MouseEvent) => e.preventDefault(),
                })),
              },
            }
          : {};

        // Update the placeholder message with the full response
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === botMessageIdRef.current
              ? {
                  ...msg,
                  content: response.content || 'No response received',
                  isLoading: false,
                  ...(toolResponse && { toolResponse }),
                  ...sourcesProps,
                  ...(response.metrics && { metrics: response.metrics }),
                }
              : msg,
          ),
        );

        // Update last response metrics for pane header display
        if (response.metrics) {
          setLastResponseMetrics(response.metrics);
        }
      }
    } catch (error) {
      // If we're clearing the conversation, silently ignore all errors
      // Messages are already reset to initial state
      if (isClearingRef.current) {
        return;
      }

      // BFF returns structured ApiError - if not, create a generic one
      const apiError: ApiError = isApiError(error)
        ? error
        : {
            error: {
              component: 'bff',
              code: 'unknown',
              message:
                error instanceof Error
                  ? error.message
                  : 'Sorry, I encountered an error while processing your request. Please try again.',
              retriable: false,
            },
          };

      // Log error details for debugging
      // eslint-disable-next-line no-console
      console.error('Response API error:', {
        component: apiError.error.component,
        code: apiError.error.code,
        message: apiError.error.message,
      });

      // Check if this is an abort error (from user stopping or clearing)
      const isAbortError =
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.message.includes('aborted') ||
          error.message === 'Response stopped by user');

      // Handle guardrail violations with custom messages
      const errorMessage = (() => {
        if (apiError.error.code === GUARDRAIL_ERROR_CODES.INPUT_VIOLATION) {
          return GUARDRAIL_MESSAGES.INPUT_VIOLATION;
        }
        if (apiError.error.code === GUARDRAIL_ERROR_CODES.OUTPUT_VIOLATION) {
          return GUARDRAIL_MESSAGES.OUTPUT_VIOLATION;
        }
        return apiError.error.message;
      })();

      if (apiError.error.code === GUARDRAIL_ERROR_CODES.INPUT_VIOLATION) {
        fireMiscTrackingEvent('Guardrail Activated', { violationDetected: true });
      }

      // Check if this was a user-initiated stop (stop button, not clear conversation)
      const wasUserStopped =
        isStoppingStreamRef.current &&
        (isAbortError || errorMessage === 'Response stopped by user');

      // Handle user-stopped messages (not errors, just user action)
      if (wasUserStopped) {
        if (isStreamingEnabled && botMessageIdRef.current) {
          // For streaming, append "You stopped this message" to existing content
          setMessages((prevMessages) =>
            prevMessages.map((msg) => {
              if (msg.id === botMessageIdRef.current) {
                const stoppedContent = msg.content
                  ? `${msg.content}\n\n*You stopped this message*`
                  : '*You stopped this message*';
                return { ...msg, content: stoppedContent, isLoading: false };
              }
              return msg;
            }),
          );
        } else {
          // For non-streaming, add stop message as new message
          const botStopMessage: MessageProps = {
            id: getId(),
            role: 'bot',
            content: '*You stopped this message*',
            name: modelDisplayName,
            avatar: botAvatar,
            timestamp: new Date().toLocaleString(),
          };
          setMessages((prevMessages) => [...prevMessages, botStopMessage]);
        }
        return; // Exit early - this is not an error to classify
      }

      // Use ref to track streaming content (avoids stale messages snapshot)
      const hadPartialContent = streamingReceivedRef.current;

      // Classify the error for UI rendering - error is already in ApiError format
      const errorClassification = classifyError(apiError, {
        modelName: modelDisplayName,
        wasStreamStarted: isStreamingEnabled,
        wasResponseGenerated: hadPartialContent,
        // TODO: Add maxTokens from model config when available
        // TODO: Add toolName if error is from MCP tool call
      });

      // Retry handler - resends the same prompt (uses refs to avoid stale closure)
      // botMessageIdRef.current is set before errors can occur, so it's always available when retry is called
      const handleRetry = () => {
        // Read latest messages from ref (avoid stale closure)
        const currentMessages = messagesRef.current;
        const lastUserMessage = currentMessages
          .slice()
          .reverse()
          .find((msg) => msg.role === 'user');

        if (!lastUserMessage?.content) {
          return; // No user message to retry
        }

        const userContent = lastUserMessage.content;

        // Remove the error message (pure state update)
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== botMessageIdRef.current),
        );

        // Schedule retry outside the updater, with guard against clearing
        setTimeout(() => {
          if (!isClearingRef.current) {
            // Verify messages still exist and include the user message (read from ref)
            const stillHasUserMessage = messagesRef.current.some(
              (msg) => msg.id === lastUserMessage.id && msg.role === 'user',
            );
            // Call latest handleMessageSend from ref
            if (stillHasUserMessage && handleMessageSendRef.current) {
              handleMessageSendRef.current(userContent);
            }
          }
        }, 0);
      };

      if (isStreamingEnabled && botMessageIdRef.current) {
        // For streaming errors, update existing bot message with error classification
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg.id === botMessageIdRef.current) {
              // Determine if this is a streaming interruption (had some content)
              const hadContent = msg.content && msg.content.length > 0;

              const updatedMessage = hadContent
                ? {
                    ...msg,
                    content: `${msg.content}...`, // Append ellipsis to signal cutoff
                    isLoading: false,
                    errorClassification,
                    onRetryError: errorClassification.isRetriable ? handleRetry : undefined,
                  }
                : {
                    ...msg,
                    content: '', // Clear loading dots
                    isLoading: false,
                    errorClassification,
                    onRetryError: errorClassification.isRetriable ? handleRetry : undefined,
                  };

              return updatedMessage;
            }
            return msg;
          }),
        );
      } else {
        // For non-streaming, update the placeholder bot message with error classification
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === botMessageIdRef.current
              ? {
                  ...msg,
                  content: '', // No content, error alert will be shown
                  isLoading: false,
                  errorClassification,
                  onRetryError: errorClassification.isRetriable ? handleRetry : undefined,
                }
              : msg,
          ),
        );
      }
    } finally {
      setIsMessageSendButtonDisabled(false);
      setIsLoading(false);
      setIsStreamingWithoutContent(false);
      isStoppingStreamRef.current = false;
      abortControllerRef.current = null;
    }
  };

  return {
    messages,
    isMessageSendButtonDisabled,
    isLoading,
    isStreamingWithoutContent,
    handleMessageSend,
    handleStopStreaming,
    clearConversation,
    scrollToBottomRef,
    lastResponseMetrics,
    modelDisplayName,
  };
};

export default useChatbotMessages;
