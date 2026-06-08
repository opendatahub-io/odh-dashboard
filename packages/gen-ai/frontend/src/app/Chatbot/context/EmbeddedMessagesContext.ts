import React from 'react';
import type { ResponsesTemplate } from '~/types/embeddable-chatbot';

/**
 * Configuration for the embedded passthrough message flow.
 * When non-null, ChatbotConfigInstance uses useEmbeddedChatbotMessages
 * instead of useChatbotMessages.
 */
type EmbeddedMessagesConfig = {
  bffBasePath: string;
  namespace: string;
  secretName: string;
  responsesTemplate: ResponsesTemplate;
};

export const EmbeddedMessagesContext = React.createContext<EmbeddedMessagesConfig | null>(null);

export const useEmbeddedMessagesConfig = (): EmbeddedMessagesConfig | null =>
  React.useContext(EmbeddedMessagesContext);

export const useIsEmbeddedPlayground = (): boolean =>
  React.useContext(EmbeddedMessagesContext) !== null;

export type { EmbeddedMessagesConfig };
