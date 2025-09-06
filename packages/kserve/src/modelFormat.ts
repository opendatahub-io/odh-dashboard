import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes.js';
import type { KServeDeployment } from './deployments';

export const extractKServeModelFormat = (
  deployment: KServeDeployment,
): SupportedModelFormats | null => {
  const modelFormat = deployment.model.spec.predictor.model?.modelFormat;
  if (modelFormat) {
    return {
      name: modelFormat.name,
      version: modelFormat.version,
    };
  }
  return null;
};

export const applyKServeModelFormatToDeployment = (
  deployment: KServeDeployment,
  modelFormat: SupportedModelFormats,
): KServeDeployment => {
  const updatedDeployment = structuredClone(deployment);
  if (!updatedDeployment.model.spec.predictor.model) {
    updatedDeployment.model.spec.predictor.model = {};
  }
  updatedDeployment.model.spec.predictor.model.modelFormat = modelFormat;
  return updatedDeployment;
};
