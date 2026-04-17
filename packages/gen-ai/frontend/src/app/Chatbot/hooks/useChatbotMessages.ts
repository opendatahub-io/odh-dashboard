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

/**
 * Extracts a user-friendly error message from an error object
 * Handles both structured API errors and generic Error objects
 */
const getErrorMessage = (error: unknown): string => {
  // Check if this is a structured error with error.error.message (mod-arch format)
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof error.error === 'object' &&
    error.error !== null &&
    'message' in error.error &&
    typeof error.error.message === 'string'
  ) {
    return error.error.message;
  }

  // Check if this is a standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback for unknown error types
  return ERROR_MESSAGES.GENERIC_ERROR;
};

/**
 * Extracts the error category/code from an error object
 * Returns undefined if no category is found
 */
const getErrorCategory = (error: unknown): string | undefined => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof error.error === 'object' &&
    error.error !== null &&
    'code' in error.error &&
    typeof error.error.code === 'string'
  ) {
    return error.error.code;
  }
  return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Safely normalizes an unknown error to ApiError format
 */
const normalizeToApiError = (error: unknown): ApiError => {
  // Handle primitives, null, undefined, and arrays
  if (!isRecord(error)) {
    return {
      status: 500,
      message: String(error),
      error: { code: 'unknown', message: String(error) },
    };
  }

  // Check if error has top-level ApiError shape (status + message)
  if (
    'status' in error &&
    'message' in error &&
    typeof error.status === 'number' &&
    typeof error.message === 'string'
  ) {
    // Error has ApiError shape, return it
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return error as ApiError;
  }

  // Check if error has nested error object (mod-arch format)
  if ('error' in error && isRecord(error.error)) {
    const nestedMessage =
      typeof error.error.message === 'string' ? error.error.message : 'An error occurred';
    // Has nested error - preserve it and add top-level defaults if missing
    return {
      status: typeof error.status === 'number' ? error.status : 500,
      message: typeof error.message === 'string' ? error.message : nestedMessage,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      error: error.error as ApiError['error'],
    };
  }

  // Fallback for unknown shape - preserve any nested info
  const fallbackMessage = typeof error.message === 'string' ? error.message : 'An error occurred';
  return {
    status: typeof error.status === 'number' ? error.status : 500,
    message: fallbackMessage,
    error: isRecord(error.error)
      ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (error.error as ApiError['error'])
      : { code: 'unknown', message: fallbackMessage },
  };
};

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

    let botMessageId: string | undefined;

    try {
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
        // Create initial bot message for streaming with loading state
        botMessageId = getId();
        const streamingBotMessage: MessageProps = {
          id: botMessageId,
          role: 'bot',
          content: '',
          name: modelDisplayName,
          avatar: botAvatar,
          isLoading: true, // Show loading dots until first content
          timestamp: new Date().toLocaleString(),
        };
        setMessages((prevMessages) => [...prevMessages, streamingBotMessage]);

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
              msg.id === botMessageId
                ? {
                    ...msg,
                    content: displayContent,
                    isLoading: !hasContent, // Hide loading dots once we have content
                  }
                : msg,
            ),
          );
        };

        // Check for mock error scenarios (trigger words) - DEVELOPMENT ONLY
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

            // Check if we have complete lines (ending with newline characters)
            const lines = currentPartialLine.split('\n');

            if (lines.length > 1) {
              // We have at least one complete line
              // Add all complete lines except the last one (which might be partial)
              completeLines.push(...lines.slice(0, -1));
              currentPartialLine = lines[lines.length - 1]; // Keep the last line as partial

              // Mark that we've received streaming content
              streamingReceivedRef.current = true;

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
            msg.id === botMessageId
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
              msg.id === botMessageId
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

        // Check for mock error scenarios (trigger words) - DEVELOPMENT ONLY
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

        const botMessage: ChatbotMessageProps = {
          id: getId(),
          role: 'bot',
          content: response.content || 'No response received',
          name: modelDisplayName,
          avatar: botAvatar,
          timestamp: new Date().toLocaleString(),
          ...(toolResponse && { toolResponse }),
          ...sourcesProps,
          ...(response.metrics && { metrics: response.metrics }),
        };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
        // Update last response metrics for pane header display
        if (response.metrics) {
          setLastResponseMetrics(response.metrics);
        }
      }
    } catch (error) {
      // Check if this is an abort error
      const isAbortError =
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.message.includes('aborted') ||
          error.message === 'Response stopped by user');

      // If we're clearing the conversation, silently ignore all errors
      // Messages are already reset to initial state
      if (isClearingRef.current) {
        return;
      }

      const rawErrorMessage =
        error instanceof Error
          ? error.message
          : 'Sorry, I encountered an error while processing your request. Please try again.';
      // Extract error category from the error object
      const errorCategory = getErrorCategory(error);

      // Log error details for debugging
      if (errorCategory) {
        // eslint-disable-next-line no-console
        console.error('Response API error:', { category: errorCategory, message: getErrorMessage(error) });
      }

      const errorCode =
        error instanceof Error && 'code' in error && typeof error.code === 'string'
          ? error.code
          : undefined;
      const errorMessage = (() => {
        if (errorCode === GUARDRAIL_ERROR_CODES.INPUT_VIOLATION) {
          return GUARDRAIL_MESSAGES.INPUT_VIOLATION;
        }
        if (errorCode === GUARDRAIL_ERROR_CODES.OUTPUT_VIOLATION) {
          return GUARDRAIL_MESSAGES.OUTPUT_VIOLATION;
        }
        return rawErrorMessage;
      })();

      if (errorCode === GUARDRAIL_ERROR_CODES.INPUT_VIOLATION) {
        fireMiscTrackingEvent('Guardrail Activated', { violationDetected: true });
      }

      // Check if this was a user-initiated stop (stop button, not clear conversation)
      const wasUserStopped =
        isStoppingStreamRef.current &&
        (isAbortError || errorMessage === 'Response stopped by user');

      // Handle user-stopped messages (not errors, just user action)
      if (wasUserStopped) {
        if (isStreamingEnabled && botMessageId) {
          // For streaming, append "You stopped this message" to existing content
          setMessages((prevMessages) =>
            prevMessages.map((msg) => {
              if (msg.id === botMessageId) {
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

      // Classify the error for UI rendering - normalize to ApiError format
      const normalizedError = normalizeToApiError(error);

      const errorClassification = classifyError(normalizedError, {
        modelName: modelDisplayName,
        wasStreamStarted: isStreamingEnabled,
        wasResponseGenerated: hadPartialContent,
        // TODO: Add maxTokens from model config when available
        // TODO: Add toolName if error is from MCP tool call
      });

      // Retry handler - resends the same prompt (uses functional state to avoid stale closure)
      const handleRetry = () => {
        // Find last user message first (outside state updater)
        const currentMessages = messages;
        const lastUserMessage = currentMessages
          .slice()
          .reverse()
          .find((msg) => msg.role === 'user');

        if (!lastUserMessage?.content) {
          return; // No user message to retry
        }

        const userContent = lastUserMessage.content;

        // Remove the error message (pure state update)
        setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== botMessageId));

        // Schedule retry outside the updater, with guard against clearing
        setTimeout(() => {
          if (!isClearingRef.current) {
            // Verify messages still exist and include the user message
            const stillHasUserMessage = messages.some(
              (msg) => msg.id === lastUserMessage.id && msg.role === 'user',
            );
            if (stillHasUserMessage) {
              handleMessageSend(userContent);
            }
          }
        }, 0);
      };

      if (isStreamingEnabled && botMessageId) {
        // For streaming errors, update existing bot message with error classification
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg.id === botMessageId) {
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
        // For non-streaming, add error message as new bot message
        const newBotId = getId();
        const botErrorMessage: ChatbotMessageProps = {
          id: newBotId,
          role: 'bot',
          content: '', // No content, error alert will be shown
          name: modelDisplayName,
          avatar: botAvatar,
          timestamp: new Date().toLocaleString(),
          errorClassification,
          onRetryError: errorClassification.isRetriable ? handleRetry : undefined,
        };
        // Set botMessageId so handleRetry can filter it out on retry
        botMessageId = newBotId;
        setMessages((prevMessages) => [...prevMessages, botErrorMessage]);
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
