/* eslint-disable camelcase */
import type { Model as LlamaModel } from 'llama-stack-client/resources/models';
import axios from '#~/utilities/axios';

// Roles must be 'user' and 'assistant' according to the Llama Stack API
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  stop_reason?: string;
};

type VectorStore = {
  created_at: number;
  expires_after: {
    anchor: string;
    days: number;
  };
  expires_at: number;
  file_counts: {
    cancelled: number;
    completed: number;
    failed: number;
    in_progress: number;
    total: number;
  };
  id: string;
  last_active_at: number;
  metadata: {
    provider_id: string;
    provider_vector_db_id: string;
  };
  name: string;
  object: string;
  status: string;
  usage_bytes: number;
};

type VectorStoreFile = {
  attributes: Record<string, unknown>;
  chunking_strategy: {
    static: {
      chunk_overlap_tokens: number;
      max_chunk_size_tokens: number;
    };
    type: string;
  };
  created_at: number;
  id: string;
  last_error: {
    code: string;
    message: string;
  };
  object: string;
  status: string;
  usage_bytes: number;
  vector_store_id: string;
};

export const listModels = (): Promise<LlamaModel[]> => {
  const url = '/api/llama-stack/models/list';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response?.data?.message || e.message || 'Failed to fetch models');
    });
};

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

export const listVectorStores = (): Promise<VectorStore[]> => {
  const url = '/gen-ai/api/v1/lsd/vectorstores';
  return axios
    .get(url)
    .then((response) => response.data.data)
    .catch((e) => {
      throw new Error(e.response?.data?.message || e.message || 'Failed to fetch vector stores');
    });
};

export const listVectorStoreFiles = (
  namespace: string,
  vectorStoreId: string,
  limit?: number,
  order?: 'asc' | 'desc',
  filter?: string,
): Promise<VectorStoreFile[]> => {
  const params = new URLSearchParams();
  params.append('namespace', namespace);
  params.append('vector_store_id', vectorStoreId);
  if (limit) {
    params.append('limit', limit.toString());
  }
  if (order) {
    params.append('order', order);
  }
  if (filter) {
    params.append('filter', filter);
  }

  const url = `/gen-ai/api/v1/lsd/vectorstores/files?${params.toString()}`;
  return axios
    .get(url)
    .then((response) => response.data.data)
    .catch((e) => {
      throw new Error(
        e.response?.data?.message || e.message || 'Failed to fetch vector store files',
      );
    });
};

export const deleteVectorStoreFile = (
  namespace: string,
  vectorStoreId: string,
  fileId: string,
): Promise<{ deleted: boolean; id: string; object: string }> => {
  const params = new URLSearchParams();
  params.append('namespace', namespace);
  params.append('vector_store_id', vectorStoreId);
  params.append('file_id', fileId);

  const url = `/gen-ai/api/v1/lsd/vectorstores/files/delete?${params.toString()}`;
  return axios
    .delete(url)
    .then((response) => response.data.data)
    .catch((e) => {
      throw new Error(
        e.response?.data?.message || e.message || 'Failed to delete vector store file',
      );
    });
};
