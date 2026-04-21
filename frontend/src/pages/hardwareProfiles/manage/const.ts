import { HardwareProfileFeatureVisibility } from '#~/k8sTypes';

export const HARDWARE_PROFILE_DISPLAY_NAME_CHAR_LIMIT = 128;
export const HARDWARE_PROFILE_DESCRIPTION_CHAR_LIMIT = 255;

export const HardwareProfileFeatureVisibilityTitles: Record<
  HardwareProfileFeatureVisibility,
  string
> = {
  [HardwareProfileFeatureVisibility.WORKBENCH]: 'Workbenches',
  [HardwareProfileFeatureVisibility.MODEL_SERVING]: 'Model serving',
};
