import { InferenceServiceKind } from '#~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { isNIMOperatorManaged } from '#~/pages/modelServing/screens/global/nimOperatorUtils';
import {
  useHardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from './useHardwareProfileConfig';
import { MODEL_SERVING_VISIBILITY } from './const';

export const extractHardwareProfileConfigFromInferenceService = (
  inferenceService?: InferenceServiceKind | null,
): Parameters<typeof useHardwareProfileConfig> => {
  const name = inferenceService?.metadata.annotations?.['opendatahub.io/hardware-profile-name'];

  // Check if NIM Operator-managed
  const isNIMManaged = inferenceService && isNIMOperatorManaged(inferenceService);

  // Get resources - handle NIM Operator case
  let resources;
  if (isNIMManaged) {
    // NIM Operator uses containers instead of model spec
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    const predictor = inferenceService.spec.predictor as any;
    resources = predictor?.containers?.[0]?.resources;
  } else {
    // Regular path
    resources = inferenceService?.spec.predictor.model?.resources;
  }

  const tolerations = inferenceService?.spec.predictor.tolerations;
  const nodeSelector = inferenceService?.spec.predictor.nodeSelector;
  const namespace = inferenceService?.metadata.namespace;
  const hardwareProfileNamespace =
    inferenceService?.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'];

  return [
    name,
    resources,
    tolerations,
    nodeSelector,
    MODEL_SERVING_VISIBILITY,
    namespace,
    hardwareProfileNamespace,
  ];
};

const useServingHardwareProfileConfig = (
  inferenceService?: InferenceServiceKind | null,
): UseHardwareProfileConfigResult => {
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;

  const [
    name,
    resources,
    tolerations,
    nodeSelector,
    visibility,
    namespace,
    hardwareProfileNamespace,
  ] = extractHardwareProfileConfigFromInferenceService(inferenceService);

  return useHardwareProfileConfig(
    name,
    resources,
    tolerations,
    nodeSelector,
    visibility,
    isProjectScoped ? namespace : undefined,
    hardwareProfileNamespace,
  );
};

export default useServingHardwareProfileConfig;
