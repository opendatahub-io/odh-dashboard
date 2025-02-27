import { HardwareProfileUseCases } from '~/k8sTypes';

export const HardwareProfileUseCaseTitles: Record<HardwareProfileUseCases, string> = {
  [HardwareProfileUseCases.WORKBENCH]: 'Workbenches',
  [HardwareProfileUseCases.MODEL_SERVING]: 'Model serving',
  [HardwareProfileUseCases.PIPELINES]: 'Data science pipelines',
};
