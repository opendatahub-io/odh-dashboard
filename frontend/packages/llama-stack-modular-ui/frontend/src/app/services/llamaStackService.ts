/* eslint-disable camelcase */
import type { Model as LlamaModel } from 'llama-stack-client/resources/models';
import axios from '@app/utilities/axios';
import { authService } from './authService';

// API URL constants
const LLAMA_STACK_BASE_URL = '/llama-stack';
const MODELS_ENDPOINT = `${LLAMA_STACK_BASE_URL}/v1/models`;
const CHAT_COMPLETION_ENDPOINT = `${LLAMA_STACK_BASE_URL}/v1/inference/chat-completion`;

// Export the chat completion endpoint for use in other components
export const CHAT_COMPLETION_URL = CHAT_COMPLETION_ENDPOINT;

// Roles must be 'user' and 'assistant' according to the Llama Stack API
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  stop_reason?: string;
};

export const listModels = (): Promise<LlamaModel[]> => {
  const url = MODELS_ENDPOINT;
  return axios
    .get(url)
    .then((response) => response.data.data)
    .catch((e) => {
      // Handle 401/403 errors specifically - user is authenticated but doesn't have access
      if (e.response?.status === 401 || e.response?.status === 403) {
        const error = new Error(
          'You are authenticated but do not have permission to access models. Please contact your administrator for access.',
        );
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
        (error as any).status = e.response?.status;
        throw error;
      }

      const errorMessage = e.response?.data?.message || e.message || 'Failed to fetch models';
      throw new Error(errorMessage);
    });
};

export const completeChat = (messages: ChatMessage[], model_id: string): Promise<string> => {
  const url = CHAT_COMPLETION_ENDPOINT;

  const formattedMessages = messages.map((msg) => {
    if (msg.role === 'assistant' && !msg.stop_reason) {
      return { ...msg, stop_reason: 'stop' };
    }
    return msg;
  });

  // Get authentication token
  const token = authService.getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, {
    method: 'POST',
    headers,
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
