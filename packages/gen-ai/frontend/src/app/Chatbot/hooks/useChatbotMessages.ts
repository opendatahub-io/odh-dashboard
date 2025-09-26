/* eslint-disable camelcase */
import * as React from 'react';
import { MessageProps } from '@patternfly/chatbot';
import userAvatar from '~/app/bgimages/user_avatar.svg';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { getId } from '~/app/utilities/utils';
import { createResponse } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings, ChatMessageRole, CreateResponseRequest } from '~/app/types';
import { ERROR_MESSAGES, initialBotMessage } from '~/app/Chatbot/const';
import { GenAiContext } from '~/app/context/GenAiContext';

export interface UseChatbotMessagesReturn {
  messages: MessageProps[];
  isMessageSendButtonDisabled: boolean;
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
  topP: number;
}

const useChatbotMessages = ({
  modelId,
  selectedSourceSettings,
  systemInstruction,
  isRawUploaded,
  username,
  isStreamingEnabled,
  temperature,
  topP,
}: UseChatbotMessagesProps): UseChatbotMessagesReturn => {
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage()]);
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const { namespace } = React.useContext(GenAiContext);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

    try {
      if (!modelId) {
        throw new Error(ERROR_MESSAGES.NO_MODEL_OR_SOURCE);
      }

      const responsesPayload: CreateResponseRequest = {
        input: message,
        model: modelId,
        ...(isRawUploaded &&
          selectedSourceSettings && {
            vector_store_ids: [selectedSourceSettings.vectorStore],
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
        top_p: topP,
      };

      if (!namespace?.name) {
        throw new Error('Namespace is required for generating responses');
      }

      if (isStreamingEnabled) {
        // Create initial bot message for streaming
        const botMessageId = getId();
        const streamingBotMessage: MessageProps = {
          id: botMessageId,
          role: 'bot',
          content: '',
          name: 'Bot',
          avatar: botAvatar,
        };
        setMessages((prevMessages) => [...prevMessages, streamingBotMessage]);

        // Handle streaming response with line-by-line display like ChatGPT
        const completeLines: string[] = [];
        let currentPartialLine = '';

        const updateMessage = (showPartialLine = true) => {
          // Combine complete lines with current partial line for display
          const displayContent =
            completeLines.join('\n') +
            (showPartialLine && currentPartialLine
              ? (completeLines.length > 0 ? '\n' : '') + currentPartialLine
              : '');

          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === botMessageId ? { ...msg, content: displayContent } : msg,
            ),
          );
        };

        await createResponse(responsesPayload, namespace.name, (chunk: string) => {
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
            updateMessage(true);
          } else {
            // No complete lines yet, just update the partial line
            // Clear previous timeout and set a new one for smooth partial line updates
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            // Update UI every 50ms for smooth streaming effect on partial lines
            timeoutRef.current = setTimeout(() => updateMessage(true), 50);
          }
        });

        // Final update to ensure all content is displayed
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        updateMessage(true);
      } else {
        // Handle non-streaming response
        const response = await createResponse(responsesPayload, namespace.name);

        const botMessage: MessageProps = {
          id: getId(),
          role: 'bot',
          content: response.content || 'No response received',
          name: 'Bot',
          avatar: botAvatar,
        };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      }
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

  return {
    messages,
    isMessageSendButtonDisabled,
    handleMessageSend,
    scrollToBottomRef,
  };
};

export default useChatbotMessages;
