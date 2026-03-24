import { InferenceServiceKind } from '#~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import {
  useHardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from './useHardwareProfileConfig';
import { MODEL_SERVING_VISIBILITY } from './const';

export const extractHardwareProfileConfigFromInferenceService = (
  inferenceService?: InferenceServiceKind | null,
): Parameters<typeof useHardwareProfileConfig> => {
  const name = inferenceService?.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
  const resources = inferenceService?.spec.predictor.model?.resources;
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
    false, // Don't auto-select profile; let platform apply its own defaults
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
    false, // Don't auto-select profile for model serving; let platform apply its own defaults
  );
};

export default useServingHardwareProfileConfig;
