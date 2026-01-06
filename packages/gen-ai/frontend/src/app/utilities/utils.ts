/* eslint-disable camelcase */
import { K8sResourceCommon } from 'mod-arch-shared';
import { AIModel, TokenInfo, MCPServerFromAPI, MCPServerConfig, MaaSModel } from '~/app/types';

/**
 * Generates a UUID v4 string
 * Uses crypto.randomUUID if available, otherwise falls back to crypto.getRandomValues
 */
export const getId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Use crypto.getRandomValues for cryptographically secure fallback
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    return Array.from(bytes, (byte, i) => {
      const hex = byte.toString(16).padStart(2, '0');
      return [4, 6, 8, 10].includes(i) ? `-${hex}` : hex;
    }).join('');
  }

  throw new Error('Crypto API not available');
};

export const convertAIModelToK8sResource = (model: AIModel): K8sResourceCommon => ({
  apiVersion: 'serving.kserve.io/v1beta1',
  kind: 'InferenceService',
  metadata: {
    name: model.model_name,
  },
});

export const splitLlamaModelId = (llamaModelId: string): { providerId: string; id: string } => {
  const slashIndex = llamaModelId.indexOf('/');
  if (slashIndex === -1) {
    return { providerId: '', id: llamaModelId };
  }
  const providerId = llamaModelId.substring(0, slashIndex);
  const id = llamaModelId.substring(slashIndex + 1);
  if (!providerId || !id) {
    return { providerId: '', id: llamaModelId };
  }
  return { providerId, id };
};

export const getLlamaModelDisplayName = (modelId: string, aiModels: AIModel[]): string => {
  const { id, providerId } = splitLlamaModelId(modelId);
  const enabledModel = aiModels.find((aiModel) => aiModel.model_id === id);
  if (!enabledModel) {
    return modelId;
  }
  if (!providerId) {
    return enabledModel.display_name;
  }
  return `${providerId}/${enabledModel.display_name}`;
};

export const isLlamaModelEnabled = (
  modelId: string,
  aiModels: AIModel[],
  maasModels: MaaSModel[],
  isCustomLSD: boolean,
): boolean => {
  if (isCustomLSD) {
    return true;
  }

  const { id } = splitLlamaModelId(modelId);

  const enabledModel = aiModels.find((aiModel) => aiModel.model_id === id);

  if (enabledModel) {
    return enabledModel.status === 'Running';
  }

  const maasModel = maasModels.find((m) => m.id === id);
  if (maasModel) {
    return maasModel.ready;
  }

  return false;
};

export const generateMCPServerConfig = (
  server: MCPServerFromAPI,
  serverTokens: Map<string, TokenInfo>,
): MCPServerConfig => {
  const serverTokenInfo = serverTokens.get(server.url);
  const headers: Record<string, string> = {};

  if (serverTokenInfo?.token) {
    const raw = serverTokenInfo.token.trim();
    headers.Authorization = raw.toLowerCase().startsWith('bearer ') ? raw : `Bearer ${raw}`;
  }

  return {
    server_label: server.name,
    server_url: server.url,
    headers,
  };
};

/**
 * Converts a MaaS model to AIModel format
 * @param maasModel - The MaaS model to convert
 * @returns The converted AIModel
 */
export const convertMaaSModelToAIModel = (maasModel: MaaSModel): AIModel => ({
  model_name: maasModel.id,
  model_id: maasModel.id,
  serving_runtime: 'MaaS',
  api_protocol: 'OpenAI',
  version: '',
  usecase: 'LLM',
  description: '', //TODO: MaaS models don't have description yet, bff needs to be updated to provide it
  endpoints: [`internal: ${maasModel.url}`],
  status: maasModel.ready ? 'Running' : 'Stop',
  display_name: maasModel.id,
  sa_token: {
    name: '',
    token_name: '',
    token: '',
  },
  internalEndpoint: maasModel.url,
  isMaaSModel: true,
  maasModelId: maasModel.id,
});

/**
 * Sanitizes error messages before sending to analytics by removing sensitive data
 * @param errorMessage - The raw error message to sanitize
 * @returns Sanitized error message safe for analytics
 */
export const sanitizeErrorMessage = (errorMessage: string): string => {
  let sanitized = errorMessage;

  // Remove URLs (http/https)
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/gi, '[URL]');

  // Remove tokens/API keys (patterns like "token: xyz", "api-key: xyz", Bearer tokens)
  sanitized = sanitized.replace(
    /\b(token|api-key|bearer|authorization)[\s:=]+[^\s,;]+/gi,
    '$1: [REDACTED]',
  );

  // Remove stack traces (lines starting with "at " or containing file paths)
  sanitized = sanitized.replace(/\s+at\s+.*/g, '');
  sanitized = sanitized.replace(/\s+\([^)]*\.(?:ts|js|tsx|jsx):\d+:\d+\)/g, '');

  // Remove file paths
  sanitized = sanitized.replace(/\/[^\s:,;]+\.(ts|js|tsx|jsx)/gi, '[FILE_PATH]');

  return sanitized.trim();
};
