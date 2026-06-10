import * as React from 'react';
import { MessageProps } from '@patternfly/chatbot';
import type { ResponsesTemplate } from '~/types/embeddable-chatbot';
import userAvatar from '~/app/bgimages/user_avatar.svg';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { getId } from '~/app/utilities/utils';
import { ResponseMetrics } from '~/app/types';
import { createPassthroughResponse } from '~/app/services/llamaStackService';
import { ChatbotMessageProps, UseChatbotMessagesReturn } from './useChatbotMessages';

// Must match the placeholder the AutoRAG pipeline embeds in responses_template.input[0].content[0].text
export const USER_QUERY_PLACEHOLDER = '<user_query_placeholder>';

/** A single message entry in the Responses API input array. */
type ResponsesInputMessage = {
  type: 'message';
  role: 'user' | 'assistant';
  content: Array<{ type: 'input_text'; text: string }>;
};

/** The request body sent to the OGX passthrough endpoint. */
export type PassthroughRequestBody = Omit<ResponsesTemplate, 'input' | 'store' | 'stream'> & {
  input: ResponsesInputMessage[];
  store: boolean;
  stream: boolean;
};

/**
 * Builds the OGX request body by substituting the user query into the template
 * and appending multi-turn conversation history.
 */
export const buildRequestBody = (
  responsesTemplate: ResponsesTemplate,
  userMessage: string,
  previousMessages: ChatbotMessageProps[],
): PassthroughRequestBody => {
  if (!responsesTemplate.input[0]?.content[0]?.text) {
    throw new Error(
      'The responses template for this pattern is invalid. Expected input[0].content[0].text to exist.',
    );
  }

  const templateText = responsesTemplate.input[0].content[0].text;
  const substitutedText = templateText.includes(USER_QUERY_PLACEHOLDER)
    ? templateText.replace(USER_QUERY_PLACEHOLDER, userMessage)
    : userMessage;

  const inputMessages: ResponsesInputMessage[] = previousMessages
    .filter((msg) => msg.content)
    .map((msg) => ({
      type: 'message' as const,
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: [{ type: 'input_text' as const, text: String(msg.content) }],
    }));

  inputMessages.push({
    type: 'message',
    role: 'user',
    content: [{ type: 'input_text', text: substitutedText }],
  });

  return {
    ...responsesTemplate,
    input: inputMessages,
    store: false,
    stream: true,
  };
};

type UseEmbeddedChatbotMessagesProps = {
  bffBasePath: string;
  namespace: string;
  secretName: string;
  responsesTemplate: ResponsesTemplate;
  username?: string;
};

/**
 * Hook for sending messages through the embedded passthrough flow.
 * Uses the raw Responses API template from AutoRAG, substituting
 * the user query into the template's placeholder.
 */
const useEmbeddedChatbotMessages = ({
  bffBasePath,
  namespace,
  secretName,
  responsesTemplate,
  username,
}: UseEmbeddedChatbotMessagesProps): UseChatbotMessagesReturn => {
  const [messages, setMessages] = React.useState<ChatbotMessageProps[]>([]);
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isStreamingWithoutContent, setIsStreamingWithoutContent] = React.useState(false);
  const [lastResponseMetrics, setLastResponseMetrics] = React.useState<ResponseMetrics | null>(
    null,
  );
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const isStoppingStreamRef = React.useRef<boolean>(false);
  const isClearingRef = React.useRef<boolean>(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStreamingWithoutContentRef = React.useRef(false);

  const modelDisplayName = responsesTemplate.model || 'Bot';
  const messagesRef = React.useRef<ChatbotMessageProps[]>(messages);
  messagesRef.current = messages;

  // Cleanup on unmount — AbortController pattern matching useChatbotMessages
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
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages]);

  const handleStopStreaming = React.useCallback(() => {
    if (abortControllerRef.current) {
      isStoppingStreamRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const clearConversation = React.useCallback(() => {
    isClearingRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
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
    setTimeout(() => {
      isClearingRef.current = false;
    }, 0);
  }, []);

  const buildRequestBodyFn = React.useCallback(
    (userMessage: string, previousMessages: ChatbotMessageProps[]) =>
      buildRequestBody(responsesTemplate, userMessage, previousMessages),
    [responsesTemplate],
  );

  const handleMessageSend = React.useCallback(
    async (message: string) => {
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
      setIsStreamingWithoutContent(true);
      isStreamingWithoutContentRef.current = true;

      let botMessageId: string | undefined;

      try {
        const requestBody = buildRequestBodyFn(message, messagesRef.current);

        abortControllerRef.current = new AbortController();

        // Create initial bot message with loading state
        botMessageId = getId();
        const streamingBotMessage: MessageProps = {
          id: botMessageId,
          role: 'bot',
          content: '',
          name: modelDisplayName,
          avatar: botAvatar,
          isLoading: true,
          timestamp: new Date().toLocaleString(),
        };
        setMessages((prevMessages) => [...prevMessages, streamingBotMessage]);

        const completeLines: string[] = [];
        let currentPartialLine = '';

        const updateMessage = (showPartialLine = true, hasContent = false) => {
          const displayContent =
            completeLines.join('\n') +
            (showPartialLine && currentPartialLine
              ? (completeLines.length > 0 ? '\n' : '') + currentPartialLine
              : '');

          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: displayContent, isLoading: !hasContent }
                : msg,
            ),
          );
        };

        const streamingResponse = await createPassthroughResponse(
          bffBasePath,
          namespace,
          secretName,
          requestBody,
          (chunk: string) => {
            const hasAnyContent =
              completeLines.length > 0 || currentPartialLine.length > 0 || chunk.length > 0;

            if (chunk && isStreamingWithoutContentRef.current) {
              isStreamingWithoutContentRef.current = false;
              setIsStreamingWithoutContent(false);
            }

            currentPartialLine += chunk;
            const lines = currentPartialLine.split('\n');

            if (lines.length > 1) {
              completeLines.push(...lines.slice(0, -1));
              currentPartialLine = lines[lines.length - 1];
              updateMessage(true, hasAnyContent);
            } else {
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }
              if (!isStoppingStreamRef.current) {
                timeoutRef.current = setTimeout(() => updateMessage(true, hasAnyContent), 50);
              }
            }
          },
          abortControllerRef.current.signal,
        );

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Build sources prop
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

        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === botMessageId
              ? { ...msg, content: streamingResponse.content, isLoading: false, ...sourcesProps }
              : msg,
          ),
        );

        if (streamingResponse.metrics) {
          setLastResponseMetrics(streamingResponse.metrics);
        }
      } catch (error) {
        const isAbortError =
          error instanceof Error &&
          (error.name === 'AbortError' ||
            error.message.includes('aborted') ||
            error.message === 'Response stopped by user');

        if (isClearingRef.current) {
          return;
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Sorry, I encountered an error while processing your request. Please try again.';

        const wasUserStopped =
          isStoppingStreamRef.current &&
          (isAbortError || errorMessage === 'Response stopped by user');

        if (botMessageId) {
          setMessages((prevMessages) =>
            prevMessages.map((msg) => {
              if (msg.id === botMessageId) {
                if (wasUserStopped) {
                  const stoppedContent = msg.content
                    ? `${msg.content}\n\n*You stopped this message*`
                    : '*You stopped this message*';
                  return { ...msg, content: stoppedContent, isLoading: false };
                }
                return { ...msg, content: errorMessage, isLoading: false };
              }
              return msg;
            }),
          );
        } else {
          const botErrorMessage: MessageProps = {
            id: getId(),
            role: 'bot',
            content: wasUserStopped ? '*You stopped this message*' : errorMessage,
            name: modelDisplayName,
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
    },
    [buildRequestBodyFn, bffBasePath, namespace, secretName, username, modelDisplayName],
  );

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

export default useEmbeddedChatbotMessages;
