import { LlamaStackClient } from 'llama-stack-client';

export const createLlamaStackClient = (namespace: string, serviceName: string): LlamaStackClient =>
  new LlamaStackClient({
    baseURL: `/api/services/llama-stack/${encodeURIComponent(namespace)}/${encodeURIComponent(serviceName)}`,
  });
