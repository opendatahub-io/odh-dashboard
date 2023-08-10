import { AcceleratorState } from '~/pages/projects/screens/detail/notebooks/useNotebookAccelerator';
import {
  PodAffinity,
  ContainerResources,
  PodToleration,
  TolerationSettings,
  ContainerResourceAttributes,
} from '~/types';
import { determineTolerations } from '~/utilities/tolerations';

export const assemblePodSpecOptions = (
  resourceSettings: ContainerResources,
  accelerator: AcceleratorState,
  tolerationSettings?: TolerationSettings,
  affinitySettings?: PodAffinity,
): {
  affinity: PodAffinity;
  tolerations: PodToleration[];
  resources: ContainerResources;
} => {
  const affinity: PodAffinity = structuredClone(affinitySettings || {});
  const resources = structuredClone(resourceSettings);
  if (accelerator.count > 0 && accelerator.accelerator) {
    if (!resources.limits) {
      resources.limits = {};
    }
    if (!resources.requests) {
      resources.requests = {};
    }
    resources.limits[accelerator.accelerator.spec.identifier] = accelerator.count;
    resources.requests[accelerator.accelerator.spec.identifier] = accelerator.count;
  } else {
    // step type down to string to avoid type errors
    const containerResourceKeys: string[] = Object.values(ContainerResourceAttributes);

    Object.keys(resources.limits || {}).forEach((key) => {
      if (!containerResourceKeys.includes(key)) {
        delete resources.limits?.[key];
      }
    });

    Object.keys(resources.requests || {}).forEach((key) => {
      if (!containerResourceKeys.includes(key)) {
        delete resources.requests?.[key];
      }
    });
  }

  const tolerations = determineTolerations(tolerationSettings, accelerator.accelerator);
  return { affinity, tolerations, resources };
};
