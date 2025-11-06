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
} from '~/app/types';
import { ERROR_MESSAGES, initialBotMessage } from '~/app/Chatbot/const';
import { useMCPSelectionContext } from '~/app/context/MCPSelectionContext';
import { useMCPServersContext } from '~/app/context/MCPServersContext';
import { useMCPTokenContext } from '~/app/context/MCPTokenContext';
import { getSelectedServersForAPI } from '~/app/utilities/mcp';
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
}: UseChatbotMessagesProps): UseChatbotMessagesReturn => {
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage()]);
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isStreamingWithoutContent, setIsStreamingWithoutContent] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playgroundSelectedServerIds } = useMCPSelectionContext();
  const serversContext = useMCPServersContext();
  const tokenContext = useMCPTokenContext();
  const { api, apiAvailable } = useGenAiAPI();

  const getSelectedServersForAPICallback = React.useCallback(
    () =>
      getSelectedServersForAPI(
        playgroundSelectedServerIds,
        serversContext.servers,
        serversContext.serverStatuses,
        tokenContext.serverTokens,
      ),
    [
      playgroundSelectedServerIds,
      serversContext.servers,
      serversContext.serverStatuses,
      tokenContext.serverTokens,
    ],
  );

  // Cleanup timeout on unmount
  React.useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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
        toggleContent: `Tool response: ${toolName}`,
        subheading: `${serverLabel}`,
        body: `Here's the summary for your ${toolName} response:`,
        cardTitle: React.createElement(ToolResponseCardTitle, { toolName }),
        cardBody: React.createElement(ToolResponseCardBody, { toolArguments, toolOutput }),
      };
    },
    [],
  );

  const handleMessageSend = async (message: string) => {
    const userMessage: MessageProps = {
      id: getId(),
      role: 'user',
      content: message,
      name: username || 'User',
      avatar: userAvatar,
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

      const mcpServers = getSelectedServersForAPICallback();

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
        ...(mcpServers.length > 0 && { mcp_servers: mcpServers }),
      };

      fireMiscTrackingEvent('Playground Query Submitted', {
        isRag: isRawUploaded,
        countofMCP: mcpServers.length,
        isStreaming: isStreamingEnabled,
      });

      if (!apiAvailable) {
        throw new Error('API is not available');
      }

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
              timeoutRef.current = setTimeout(() => updateMessage(true, hasAnyContent), 50);
            }
          },
        });

        // Final update to ensure all content is displayed
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        const finalHasContent = completeLines.length > 0 || currentPartialLine.length > 0;
        updateMessage(true, finalHasContent);

        // Add tool response if available from streaming response
        if (streamingResponse.toolCallData) {
          const toolResponse = createToolResponse(streamingResponse.toolCallData);
          setMessages((prevMessages) =>
            prevMessages.map((msg) => (msg.id === botMessageId ? { ...msg, toolResponse } : msg)),
          );
        }
      } else {
        // Handle non-streaming response
        const response = await api.createResponse(responsesPayload);

        const toolResponse = response.toolCallData
          ? createToolResponse(response.toolCallData)
          : undefined;

        const botMessage: MessageProps = {
          id: getId(),
          role: 'bot',
          content: response.content || 'No response received',
          name: 'Bot',
          avatar: botAvatar,
          ...(toolResponse && { toolResponse }),
        };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Sorry, I encountered an error while processing your request. Please try again.';

      const botErrorMessage: MessageProps = {
        id: isStreamingEnabled ? botMessageId : getId(),
        role: 'bot',
        content: errorMessage,
        name: 'Bot',
        avatar: botAvatar,
      };

      setMessages((prevMessages) => {
        if (isStreamingEnabled) {
          return prevMessages.map((msg) => (msg.id === botMessageId ? botErrorMessage : msg));
        }
        return [...prevMessages, botErrorMessage];
      });
    } finally {
      setIsMessageSendButtonDisabled(false);
      setIsLoading(false);
      setIsStreamingWithoutContent(false);
    }
  };

  return {
    messages,
    isMessageSendButtonDisabled,
    isLoading,
    isStreamingWithoutContent,
    handleMessageSend,
    scrollToBottomRef,
  };
};

export default useChatbotMessages;
