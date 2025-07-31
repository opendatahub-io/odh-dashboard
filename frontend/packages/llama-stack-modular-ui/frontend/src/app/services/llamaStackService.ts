/* eslint-disable camelcase */
/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import axios from '../utilities/axios';

export type LlamaModel = {
  identifier: string;
  metadata: Record<string, boolean | number | string | Array<unknown> | unknown | null>;
  model_type: 'llm' | 'embedding';
  provider_id: string;
  type: 'model';
  provider_resource_id?: string;
};

// Roles must be 'user' and 'assistant' according to the Llama Stack API
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  stop_reason?: string;
};

export const getModels = (): Promise<LlamaModel[]> => {
  const url = '/api/v1/models';
  return axios
    .get(url)
    .then((response) => response.data.data.items)
    .catch((error) => {
      throw new Error(error.response.data.message || 'Failed to fetch models');
    });
};

//Fix this to use the new BFF endpoint
export const completeChat = (messages: ChatMessage[], model_id: string): Promise<string> => {
  const url = '/api/llama-stack/chat/complete';

  const formattedMessages = messages.map((msg) => {
    if (msg.role === 'assistant' && !msg.stop_reason) {
      return { ...msg, stop_reason: 'stop' };
    }
    return msg;
  });

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: formattedMessages, model_id }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((msg) => {
          throw new Error(msg || 'Failed to fetch chat completion');
        });
      }
      return response.text();
    })
    .catch((error) => {
      throw new Error(error.message || 'Chat completion error');
    });
};
