import {
  PodAffinity,
  ContainerResources,
  PodToleration,
  TolerationSettings,
  ContainerResourceAttributes,
  VolumeMount,
  Volume,
} from '~/types';
import { determineTolerations } from '~/utilities/tolerations';

export const assemblePodSpecOptions = (
  resourceSettings: ContainerResources,
  gpus: number,
  tolerationSettings?: TolerationSettings,
  affinitySettings?: PodAffinity,
): {
  affinity: PodAffinity;
  tolerations: PodToleration[];
  resources: ContainerResources;
} => {
  let affinity: PodAffinity = structuredClone(affinitySettings || {});
  const resources = structuredClone(resourceSettings);
  if (gpus > 0) {
    if (!resources.limits) {
      resources.limits = {};
    }
    if (!resources.requests) {
      resources.requests = {};
    }
    resources.limits[ContainerResourceAttributes.NVIDIA_GPU] = gpus;
    resources.requests[ContainerResourceAttributes.NVIDIA_GPU] = gpus;
  } else {
    delete resources.limits?.[ContainerResourceAttributes.NVIDIA_GPU];
    delete resources.requests?.[ContainerResourceAttributes.NVIDIA_GPU];
    affinity = {
      nodeAffinity: {
        preferredDuringSchedulingIgnoredDuringExecution: [
          {
            preference: {
              matchExpressions: [
                {
                  key: 'nvidia.com/gpu.present',
                  operator: 'NotIn',
                  values: ['true'],
                },
              ],
            },
            weight: 1,
          },
        ],
      },
    };
  }

  const tolerations = determineTolerations(gpus > 0, tolerationSettings);
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
