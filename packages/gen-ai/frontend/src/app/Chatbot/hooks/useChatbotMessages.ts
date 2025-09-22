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
}

const useChatbotMessages = ({
  modelId,
  selectedSourceSettings,
  systemInstruction,
  isRawUploaded,
  username,
  isStreamingEnabled,
}: UseChatbotMessagesProps): UseChatbotMessagesReturn => {
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage()]);
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const { namespace } = React.useContext(GenAiContext);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

        // Handle streaming response with debounced updates
        let streamingContent = '';

        const updateMessage = () => {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === botMessageId ? { ...msg, content: streamingContent } : msg,
            ),
          );
        };

        await createResponse(responsesPayload, namespace.name, (chunk: string) => {
          // Accumulate content
          streamingContent += chunk;

          // Clear previous timeout and set a new one
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          // Update UI every 50ms for smooth streaming effect
          timeoutRef.current = setTimeout(updateMessage, 50);
        });

        // Final update to ensure all content is displayed
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        updateMessage();
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
