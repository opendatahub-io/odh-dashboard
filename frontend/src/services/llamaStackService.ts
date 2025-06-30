/* eslint-disable camelcase */
import type { Model as LlamaModel } from 'llama-stack-client/resources/models';
import axios from '#~/utilities/axios';

type OutgoingChatMessage = {
  message: string;
  assistantName: string;
  files?: File[];
};

function buildMultipartRequestInit(networkChatRequest: string, files: File[]): RequestInit {
  const formData = new FormData();
  formData.append('request', networkChatRequest);
  files.forEach((file) => {
    formData.append('files', file);
  });

  return {
    method: 'POST',
    body: formData,
  };
}

function buildStandardRequestInit(networkChatRequest: string): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: networkChatRequest,
  };
}

export const listModels = (): Promise<LlamaModel[]> => {
  const url = '/api/llama-stack/models/list';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export async function completeChat(
  message: OutgoingChatMessage,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const useMultipart = Boolean(message.files?.length);

  const networkChatRequest = JSON.stringify({
    messages: [
      {
        role: 'user',
        content: message.message,
      },
    ],
    model_id: 'llama3.2:latest',
  });

  let fetchRequest: RequestInit;
  if (useMultipart && message.files) {
    fetchRequest = buildMultipartRequestInit(networkChatRequest, message.files);
  } else {
    fetchRequest = buildStandardRequestInit(networkChatRequest);
  }

  fetchRequest.signal = signal;

  const response = await fetch('/api/llama-stack/chat/complete', fetchRequest);

  if (!response.ok) {
    throw new Error(response.status.toString());
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  return response.body;
}
