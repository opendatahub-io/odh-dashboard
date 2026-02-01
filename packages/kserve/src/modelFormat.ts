import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import {
  isNIMOperatorManaged,
  getModelNameFromNIMInferenceService,
} from '@odh-dashboard/internal/pages/modelServing/screens/global/nimOperatorUtils';
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

  // Check if this is a NIM Operator-managed deployment
  if (isNIMOperatorManaged(deployment.model)) {
    const modelName = getModelNameFromNIMInferenceService(deployment.model);
    if (modelName) {
      return {
        name: modelName,
        version: undefined,
      };
    }
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
