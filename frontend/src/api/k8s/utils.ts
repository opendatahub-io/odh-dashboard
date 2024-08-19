import { AcceleratorProfileSelectFieldState } from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';
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
  initialAcceleratorProfile?: AcceleratorProfileState,
  selectedAcceleratorProfile?: AcceleratorProfileSelectFieldState,
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

  // if not using existing settings, just use the new settings
  if (!selectedAcceleratorProfile?.useExistingSettings) {
    resources = structuredClone(resourceSettings);
  }

  // Clear the last accelerator from the resources
  if (initialAcceleratorProfile?.acceleratorProfile) {
    if (resources.limits) {
      delete resources.limits[initialAcceleratorProfile.acceleratorProfile.spec.identifier];
    }
    if (resources.requests) {
      delete resources.requests[initialAcceleratorProfile.acceleratorProfile.spec.identifier];
    }
  }

  // Add back the new accelerator to the resources if count > 0
  if (selectedAcceleratorProfile?.profile && selectedAcceleratorProfile.count > 0) {
    if (resources.limits) {
      resources.limits[selectedAcceleratorProfile.profile.spec.identifier] =
        selectedAcceleratorProfile.count;
    }
    if (resources.requests) {
      resources.requests[selectedAcceleratorProfile.profile.spec.identifier] =
        selectedAcceleratorProfile.count;
    }
  }

  const tolerations = determineTolerations(
    tolerationSettings,
    initialAcceleratorProfile,
    selectedAcceleratorProfile,
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
