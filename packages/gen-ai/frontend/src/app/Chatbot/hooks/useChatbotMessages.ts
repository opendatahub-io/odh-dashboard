/* eslint-disable camelcase */
import * as React from 'react';
import { MessageProps, ToolResponseProps } from '@patternfly/chatbot';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import userAvatar from '~/app/bgimages/user_avatar.svg';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { getId } from '~/app/utilities/utils';
import {
  ChatbotSourceSettings,
  ChatMessageRole,
  CreateResponseRequest,
  MCPToolCallData,
  MCPServerFromAPI,
  TokenInfo,
} from '~/app/types';
import { ERROR_MESSAGES, initialBotMessage } from '~/app/Chatbot/const';
import { getSelectedServersForAPI } from '~/app/utilities/mcp';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';
import {
  ToolResponseCardTitle,
  ToolResponseCardBody,
} from '~/app/Chatbot/ChatbotMessagesToolResponse';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';

export interface UseChatbotMessagesReturn {
  messages: MessageProps[];
  isMessageSendButtonDisabled: boolean;
  isLoading: boolean;
  isStreamingWithoutContent: boolean;
  handleMessageSend: (message: string) => Promise<void>;
  handleStopStreaming: () => void;
  clearConversation: () => void;
  scrollToBottomRef: React.RefObject<HTMLDivElement>;
}

interface UseChatbotMessagesProps {
  modelId: string;
  selectedSourceSettings: ChatbotSourceSettings | null;
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
}

const useChatbotMessages = ({
  modelId,
  selectedSourceSettings,
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
}: UseChatbotMessagesProps): UseChatbotMessagesReturn => {
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage()]);
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isStreamingWithoutContent, setIsStreamingWithoutContent] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const isStoppingStreamRef = React.useRef<boolean>(false);
  const isClearingRef = React.useRef<boolean>(false);
  const { api, apiAvailable } = useGenAiAPI();

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

    // Reset everything to initial state
    setMessages([initialBotMessage()]);
    setIsMessageSendButtonDisabled(false);
    setIsLoading(false);
    setIsStreamingWithoutContent(false);
    isStoppingStreamRef.current = false;

    // Reset clearing flag after state updates complete
    // Use setTimeout to ensure this runs after React finishes all state updates
    setTimeout(() => {
      isClearingRef.current = false;
    }, 0);
  }, []);

  const handleMessageSend = async (message: string) => {
    const userMessage: MessageProps = {
      id: getId(),
      role: 'user',
      content: message,
      name: username || 'User',
      avatar: userAvatar,
      timestamp: new Date().toLocaleString(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
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

      // Determine vector store ID to use for RAG
      const vectorStoreIdToUse = selectedSourceSettings?.vectorStore || currentVectorStoreId;

      const responsesPayload: CreateResponseRequest = {
        input: message,
        model: modelId,
        ...(isRawUploaded &&
          vectorStoreIdToUse && {
            vector_store_ids: [vectorStoreIdToUse],
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
      };

      fireMiscTrackingEvent('Playground Query Submitted', {
        isRag: isRawUploaded,
        countofMCP: selectedMcpServers.length,
        isStreaming: isStreamingEnabled,
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
          name: 'Bot',
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

        const streamingResponse = await api.createResponse(responsesPayload, {
          abortSignal: abortControllerRef.current.signal,
          onStreamData: (chunk: string) => {
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

        // Add tool response if available from streaming response
        if (streamingResponse.toolCallData) {
          const toolResponse = createToolResponse(streamingResponse.toolCallData);
          setMessages((prevMessages) =>
            prevMessages.map((msg) => (msg.id === botMessageId ? { ...msg, toolResponse } : msg)),
          );
        }
      } else {
        // Handle non-streaming response
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

        const botMessage: MessageProps = {
          id: getId(),
          role: 'bot',
          content: response.content || 'No response received',
          name: 'Bot',
          avatar: botAvatar,
          timestamp: new Date().toLocaleString(),
          ...(toolResponse && { toolResponse }),
          ...sourcesProps,
        };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
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

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Sorry, I encountered an error while processing your request. Please try again.';

      // Check if this was a user-initiated stop (stop button, not clear conversation)
      const wasUserStopped =
        isStoppingStreamRef.current &&
        (isAbortError || errorMessage === 'Response stopped by user');

      if (isStreamingEnabled && botMessageId) {
        // For streaming, update existing bot message
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg.id === botMessageId) {
              if (wasUserStopped) {
                // Append "You stopped this message" to existing content
                const stoppedContent = msg.content
                  ? `${msg.content}\n\n*You stopped this message*`
                  : '*You stopped this message*';
                return { ...msg, content: stoppedContent, isLoading: false };
              }
              // For other errors, replace content with error message
              return { ...msg, content: errorMessage, isLoading: false };
            }
            return msg;
          }),
        );
      } else {
        // For non-streaming, add error/stop message as new message
        const botErrorMessage: MessageProps = {
          id: getId(),
          role: 'bot',
          content: wasUserStopped ? '*You stopped this message*' : errorMessage,
          name: 'Bot',
          avatar: botAvatar,
          timestamp: new Date().toLocaleString(),
        };
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
  };
};

export default useChatbotMessages;
