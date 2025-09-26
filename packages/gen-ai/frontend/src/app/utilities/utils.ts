import { K8sResourceCommon } from 'mod-arch-shared';
import { AIModel } from '~/app/types';

export const getId = (): `${string}-${string}-${string}-${string}-${string}` => crypto.randomUUID();

export const convertAIModelToK8sResource = (model: AIModel): K8sResourceCommon => ({
  apiVersion: 'serving.kserve.io/v1beta1',
  kind: 'InferenceService',
  metadata: {
    name: model.model_name,
  },
});
