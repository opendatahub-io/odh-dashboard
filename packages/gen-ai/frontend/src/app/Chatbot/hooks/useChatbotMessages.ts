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
}

const useChatbotMessages = ({
  modelId,
  selectedSourceSettings,
  systemInstruction,
  isRawUploaded,
  username,
}: UseChatbotMessagesProps): UseChatbotMessagesReturn => {
  const [messages, setMessages] = React.useState<MessageProps[]>([initialBotMessage()]);
  const [isMessageSendButtonDisabled, setIsMessageSendButtonDisabled] = React.useState(false);
  const scrollToBottomRef = React.useRef<HTMLDivElement>(null);
  const { namespace } = React.useContext(GenAiContext);

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
      };

      if (!namespace?.name) {
        throw new Error('Namespace is required for generating responses');
      }
      const response = await createResponse(responsesPayload, namespace.name);

      const botMessage: MessageProps = {
        id: getId(),
        role: 'bot',
        content: response.content || 'No response received',
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
  };

  return {
    messages,
    isMessageSendButtonDisabled,
    handleMessageSend,
    scrollToBottomRef,
  };
};

export default useChatbotMessages;
