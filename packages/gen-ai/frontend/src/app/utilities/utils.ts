import { K8sResourceCommon } from 'mod-arch-shared';
import { AIModel, TokenInfo, MCPServerFromAPI, MCPServerConfig } from '~/app/types';

export const getId = (): `${string}-${string}-${string}-${string}-${string}` => crypto.randomUUID();

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

export const getLlamaModelStatus = (
  modelId: string,
  aiModels: AIModel[],
): AIModel['status'] | undefined => {
  const { id } = splitLlamaModelId(modelId);
  const enabledModel = aiModels.find((aiModel) => aiModel.model_id === id);
  return enabledModel?.status;
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

  /* eslint-disable camelcase */
  return {
    server_label: server.name,
    server_url: server.url,
    headers,
  };
  /* eslint-enable camelcase */
};
