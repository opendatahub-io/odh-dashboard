import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import {
  useHardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from './useHardwareProfileConfig';

const useServingHardwareProfileConfig = (
  servingRuntime?: ServingRuntimeKind | null,
  inferenceService?: InferenceServiceKind | null,
): UseHardwareProfileConfigResult => {
  const name = servingRuntime?.metadata.annotations?.['opendatahub.io/hardware-profile-name'];
  const resources =
    inferenceService?.spec.predictor.model?.resources ||
    servingRuntime?.spec.containers[0].resources;
  const tolerations =
    inferenceService?.spec.predictor.tolerations || servingRuntime?.spec.tolerations;
  const nodeSelector =
    inferenceService?.spec.predictor.nodeSelector || servingRuntime?.spec.nodeSelector;

  return useHardwareProfileConfig(name, resources, tolerations, nodeSelector);
};

export default useServingHardwareProfileConfig;
