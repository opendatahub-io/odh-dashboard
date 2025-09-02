import { HardwareProfileFeatureVisibility, InferenceServiceKind } from '#~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import {
  useHardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from './useHardwareProfileConfig';

export const extractHardwareProfileConfigFromInferenceService = (
  inferenceService?: InferenceServiceKind | null,
  isProjectScoped?: boolean,
): Parameters<typeof useHardwareProfileConfig> => {
  const legacyName =
    inferenceService?.metadata.annotations?.['opendatahub.io/legacy-hardware-profile-name'];
  const name =
    legacyName || inferenceService?.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
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
    [HardwareProfileFeatureVisibility.MODEL_SERVING],
    isProjectScoped ? namespace : undefined,
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
  ] = extractHardwareProfileConfigFromInferenceService(inferenceService, isProjectScoped);

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
