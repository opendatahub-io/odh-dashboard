import {
  PodAffinity,
  ContainerResources,
  PodToleration,
  TolerationSettings,
  VolumeMount,
  Volume,
} from '~/types';
import { determineTolerations } from '~/utilities/tolerations';
import { AcceleratorState } from '~/utilities/useAcceleratorState';

export const assemblePodSpecOptions = (
  resourceSettings: ContainerResources,
  accelerator?: AcceleratorState,
  tolerationSettings?: TolerationSettings,
  existingTolerations?: PodToleration[],
  affinitySettings?: PodAffinity,
  existingResources?: ContainerResources,
): {
  affinity: PodAffinity;
  tolerations: PodToleration[];
  resources: ContainerResources;
} => {
  const affinity: PodAffinity = structuredClone(affinitySettings || {});
  let resources: ContainerResources = {
    limits: { ...existingResources?.limits, ...resourceSettings?.limits },
    requests: { ...existingResources?.requests, ...resourceSettings?.requests },
  };

  if (accelerator?.additionalOptions?.useExisting && !accelerator.useExisting) {
    resources = structuredClone(resourceSettings);
  }

  // Clear the last accelerator from the resources
  if (accelerator?.initialAccelerator) {
    if (resources.limits) {
      delete resources.limits[accelerator.initialAccelerator.spec.identifier];
    }
    if (resources.requests) {
      delete resources.requests[accelerator.initialAccelerator.spec.identifier];
    }
  }

  // Add back the new accelerator to the resources if count > 0
  if (accelerator?.accelerator && accelerator.count > 0) {
    if (resources.limits) {
      resources.limits[accelerator.accelerator.spec.identifier] = accelerator.count;
    }
    if (resources.requests) {
      resources.requests[accelerator.accelerator.spec.identifier] = accelerator.count;
    }
  }

  const tolerations = determineTolerations(tolerationSettings, accelerator, existingTolerations);
  return { affinity, tolerations, resources };
};

export const getshmVolumeMount = (): VolumeMount => ({
  name: 'shm',
  mountPath: '/dev/shm',
});

export const getshmVolume = (sizeLimit?: string): Volume => ({
  name: 'shm',
  emptyDir: { medium: 'Memory', ...(sizeLimit && { sizeLimit }) },
});
