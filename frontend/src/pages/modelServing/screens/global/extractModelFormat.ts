import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import type { SupportedModelFormats, InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { isNIMOperatorManaged, getModelNameFromNIMInferenceService } from './nimOperatorUtils';

type KServeDeployment = Deployment<InferenceServiceKind, ServingRuntimeKind>;

export const extractKServeModelFormatWithNIM = (
  deployment: KServeDeployment,
): SupportedModelFormats | null => {
  const modelFormat = deployment.model.spec.predictor.model?.modelFormat;
  if (modelFormat) {
    return {
      name: modelFormat.name,
      version: modelFormat.version,
    };
  }

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
