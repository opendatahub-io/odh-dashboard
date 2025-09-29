import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';

export const HardwareProfileFeatureVisibilityTitles: Record<
  HardwareProfileFeatureVisibility,
  string
> = {
  [HardwareProfileFeatureVisibility.WORKBENCH]: 'Workbenches',
  [HardwareProfileFeatureVisibility.MODEL_SERVING]: 'Model serving',
};
