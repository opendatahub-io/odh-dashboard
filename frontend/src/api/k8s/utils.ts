import {
  PodAffinity,
  ContainerResources,
  Toleration,
  TolerationSettings,
  VolumeMount,
  Volume,
} from '~/types';
import { determineTolerations } from '~/utilities/tolerations';
import { AcceleratorProfileState } from '~/utilities/useAcceleratorProfileState';

export const assemblePodSpecOptions = (
  resourceSettings: ContainerResources,
  acceleratorProfileState?: AcceleratorProfileState,
  tolerationSettings?: TolerationSettings,
  existingTolerations?: Toleration[],
  affinitySettings?: PodAffinity,
  existingResources?: ContainerResources,
): {
  affinity: PodAffinity;
  tolerations: Toleration[];
  resources: ContainerResources;
} => {
  const affinity: PodAffinity = structuredClone(affinitySettings || {});
  let resources: ContainerResources = {
    limits: { ...existingResources?.limits, ...resourceSettings.limits },
    requests: { ...existingResources?.requests, ...resourceSettings.requests },
  };

  if (
    acceleratorProfileState?.additionalOptions?.useExisting &&
    !acceleratorProfileState.useExisting
  ) {
    resources = structuredClone(resourceSettings);
  }

  // Clear the last accelerator from the resources
  if (acceleratorProfileState?.initialAcceleratorProfile) {
    if (resources.limits) {
      delete resources.limits[acceleratorProfileState.initialAcceleratorProfile.spec.identifier];
    }
    if (resources.requests) {
      delete resources.requests[acceleratorProfileState.initialAcceleratorProfile.spec.identifier];
    }
  }

  // Add back the new accelerator to the resources if count > 0
  if (acceleratorProfileState?.acceleratorProfile && acceleratorProfileState.count > 0) {
    if (resources.limits) {
      resources.limits[acceleratorProfileState.acceleratorProfile.spec.identifier] =
        acceleratorProfileState.count;
    }
    if (resources.requests) {
      resources.requests[acceleratorProfileState.acceleratorProfile.spec.identifier] =
        acceleratorProfileState.count;
    }
  }

  const tolerations = determineTolerations(
    tolerationSettings,
    acceleratorProfileState,
    existingTolerations,
  );
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
