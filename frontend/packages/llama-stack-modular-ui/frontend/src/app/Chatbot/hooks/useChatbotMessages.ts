/* eslint-disable camelcase */
import * as React from 'react';
import { MessageProps } from '@patternfly/chatbot';
import userAvatar from '~/app/bgimages/user_avatar.svg';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { getId } from '~/app/utilities/utils';
import { querySource } from '~/app/services/llamaStackService';
import { ChatbotSourceSettings, Query } from '~/app/types';
import {
  QUERY_CONFIG,
  SAMPLING_STRATEGY,
  ERROR_MESSAGES,
  initialBotMessage,
} from '~/app/Chatbot/const';

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
}

const useChatbotMessages = ({
  modelId,
  selectedSourceSettings,
  systemInstruction,
  isRawUploaded,
}: UseChatbotMessagesProps): UseChatbotMessagesReturn => {
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage()]);
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleMessageSend = React.useCallback(
    async (message: string) => {
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
        if (!modelId) {
          throw new Error(ERROR_MESSAGES.NO_MODEL_OR_SOURCE);
        }

        const query: Query = {
          content: message,
          ...(isRawUploaded &&
            selectedSourceSettings && {
              vector_db_ids: [selectedSourceSettings.vectorDB],
            }),
          query_config: {
            chunk_template: QUERY_CONFIG.CHUNK_TEMPLATE,
            max_chunks: QUERY_CONFIG.MAX_CHUNKS,
            max_tokens_in_context: QUERY_CONFIG.MAX_TOKENS_IN_CONTEXT,
          },
          llm_model_id: modelId,
          sampling_params: {
            strategy: {
              type: SAMPLING_STRATEGY.TYPE,
            },
            max_tokens: QUERY_CONFIG.MAX_TOKENS,
          },
          system_prompt: systemInstruction,
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
    },
    [isRawUploaded, modelId, selectedSourceSettings, systemInstruction],
  );

  return {
    messages,
    isMessageSendButtonDisabled,
    handleMessageSend,
    scrollToBottomRef,
  };
};

export default useChatbotMessages;
