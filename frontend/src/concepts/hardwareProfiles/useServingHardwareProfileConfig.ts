import {
  HardwareProfileFeatureVisibility,
  InferenceServiceKind,
  ServingRuntimeKind,
} from '#~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import {
  useHardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from './useHardwareProfileConfig';

const useServingHardwareProfileConfig = (
  servingRuntime?: ServingRuntimeKind | null,
  inferenceService?: InferenceServiceKind | null,
): UseHardwareProfileConfigResult => {
  const legacyName =
    servingRuntime?.metadata.annotations?.['opendatahub.io/legacy-hardware-profile-name'];
  const name =
    legacyName || servingRuntime?.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
  const resources =
    inferenceService?.spec.predictor.model?.resources ||
    servingRuntime?.spec.containers[0].resources;
  const tolerations =
    inferenceService?.spec.predictor.tolerations || servingRuntime?.spec.tolerations;
  const nodeSelector =
    inferenceService?.spec.predictor.nodeSelector || servingRuntime?.spec.nodeSelector;
  const namespace = servingRuntime?.metadata.namespace;
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const hardwareProfileNamespace =
    servingRuntime?.metadata.annotations?.['opendatahub.io/hardware-profile-namespace'];

  return useHardwareProfileConfig(
    name,
    resources,
    tolerations,
    nodeSelector,
    [HardwareProfileFeatureVisibility.MODEL_SERVING],
    isProjectScoped ? namespace : undefined,
    hardwareProfileNamespace,
  );
};

export default useServingHardwareProfileConfig;
