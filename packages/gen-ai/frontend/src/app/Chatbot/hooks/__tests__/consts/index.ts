/* eslint-disable camelcase */
import {
  SimplifiedResponseData,
  ChatbotSourceSettings,
  TokenInfo,
  ResponseMetrics,
} from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';

// Test constants
export const mockModelId = 'test-model-id';

export const mockMetrics: ResponseMetrics = {
  latency_ms: 1500,
  time_to_first_token_ms: 200,
  usage: { input_tokens: 10, output_tokens: 50, total_tokens: 60 },
};

export const mockSourceSettings: ChatbotSourceSettings = {
  vectorStore: 'test-vector-db',
  embeddingModel: 'test-embedding-model',
  maxChunkLength: 500,
  delimiter: '\n\n',
  chunkOverlap: 50,
};

export const mockSuccessResponse: SimplifiedResponseData = {
  id: 'resp-123',
  model: 'test-model-id',
  status: 'completed',
  created_at: 0,
  content: 'This is a bot response',
};

export const mockNamespace = { name: 'test-namespace' };

// Provide default MCP data as props to the hook
export const defaultMcpProps = {
  mcpServers: [],
  mcpServerStatuses: new Map<string, ServerStatusInfo>(),
  mcpServerTokens: new Map<string, TokenInfo>(),
};
