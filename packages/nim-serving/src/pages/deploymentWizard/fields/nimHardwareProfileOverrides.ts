import type { WizardStateOverrides } from '@odh-dashboard/model-serving/shared/types/form-data';
import { NVIDIA_ACCELERATOR_PREFIX } from '../../../constants';

export const getNIMHardwareProfileFieldOverrides = (): WizardStateOverrides => ({
  hardwareProfile: { preferredAccelerator: NVIDIA_ACCELERATOR_PREFIX },
});
