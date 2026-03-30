/* eslint-disable camelcase */
import { K8sResourceCommon } from 'mod-arch-shared';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
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
    return (
      enabledModel.status === 'Running' || enabledModel.model_source_type === 'custom_endpoint'
    );
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
  let authorization: string | undefined;

  if (serverTokenInfo?.token) {
    let token = serverTokenInfo.token.trim();
    // Strip "Bearer " prefix if present (case-insensitive)
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }
    authorization = token || undefined;
  }

  return {
    server_label: server.name,
    server_url: server.url,
    authorization,
  };
};

export const parseEndpointByPrefix = (
  endpoints: string[],
  prefix: 'internal' | 'external',
): string | undefined =>
  endpoints
    .find((e) => e.startsWith(`${prefix}:`))
    ?.replace(`${prefix}:`, '')
    .trim();

/**
 * Checks if a URL points to a Kubernetes cluster-local service.
 * It properly parses the URL and checks only the hostname to prevent manipulation
 * via query parameters or path components.
 *
 * Examples:
 *   - "http://service.namespace.svc.cluster.local" -> true
 *   - "https://service.namespace.svc.cluster.local:8080/path" -> true
 *   - "https://evil.com/redirect?to=http://internal.svc.cluster.local" -> false
 *   - "https://api.openai.com" -> false
 *
 * If the URL cannot be parsed, it returns false (treats it as external for safety).
 *
 * @param rawURL - The URL to check
 * @param clusterDomains - Additional cluster domain suffixes to treat as internal
 * @returns true if the URL is cluster-local, false otherwise
 */
export const isClusterLocalURL = (rawURL: string, clusterDomains: string[] = []): boolean => {
  try {
    const url = new URL(rawURL);

    // Always check .svc.cluster.local as a fallback
    if (url.hostname.endsWith('.svc.cluster.local')) {
      return true;
    }

    // Check configured cluster domains
    return clusterDomains.some((domain) => domain && url.hostname.endsWith(domain));
  } catch {
    // If we can't parse it, treat it as external for safety
    return false;
  }
};

const SOURCE_LABELS: Record<string, string> = {
  namespace: 'Internal',
  custom_endpoint: 'Custom endpoint',
  maas: 'MaaS',
};

const MODEL_TYPE_LABELS: Record<string, string> = {
  llm: 'Inferencing',
  embedding: 'Embedding',
};

export const getModelTypeLabel = (modelType?: string): string =>
  MODEL_TYPE_LABELS[modelType || 'llm'] || 'Inferencing';

export const getSourceLabel = (model: AIModel): string => {
  const source = model.model_source_type;
  const label = SOURCE_LABELS[source];
  if (!label) {
    // eslint-disable-next-line no-console
    console.warn(`Unknown model source type: "${source}" for model "${model.model_id}"`);
  }
  return label || 'Internal';
};

const SOURCE_LABEL_COLORS: Record<string, 'blue' | 'green' | 'orange' | 'grey'> = {
  MaaS: 'blue',
  'Custom endpoint': 'green',
  Internal: 'grey',
};

export const getSourceLabelColor = (sourceLabel: string): 'blue' | 'green' | 'orange' | 'grey' =>
  SOURCE_LABEL_COLORS[sourceLabel] ?? 'grey';

/**
 * Converts a MaaS model to AIModel format
 * @param maasModel - The MaaS model to convert
 * @returns The converted AIModel
 */
export const convertMaaSModelToAIModel = (maasModel: MaaSModel): AIModel => ({
  model_name: maasModel.display_name || maasModel.id,
  model_id: maasModel.id,
  serving_runtime: 'MaaS',
  api_protocol: 'OpenAI',
  version: '',
  usecase: maasModel.usecase || 'LLM',
  description: maasModel.description || '',
  endpoints: maasModel.url ? [`external: ${maasModel.url}`] : [],
  status: maasModel.ready ? 'Running' : 'Stop',
  display_name: maasModel.display_name || maasModel.id,
  sa_token: {
    name: '',
    token_name: '',
    token: '',
  },
  model_source_type: 'maas',
  externalEndpoint: maasModel.url || undefined,
  internalEndpoint: undefined,
  model_type: maasModel.model_type,
  subscriptions: maasModel.subscriptions,
});

/**
 * Properties for clipboard copy tracking events
 */
export type ClipboardCopyTrackingProperties = {
  assetType?: 'model' | 'maas_model';
  assetId?: string;
  copyTarget?: 'endpoint' | 'service_token';
  endpointType?: 'external' | 'internal' | 'maas_route';
};

/**
 * Copies text to clipboard and fires a tracking event
 *
 * @param text - The text to copy to the clipboard
 * @param eventName - Name of the tracking event
 * @param properties - Properties of the tracking event
 */
export const copyToClipboardWithTracking = async (
  text: string,
  eventName: string,
  properties: ClipboardCopyTrackingProperties,
): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    fireMiscTrackingEvent(eventName, properties);
  } catch {
    // Do nothing
  }
};
