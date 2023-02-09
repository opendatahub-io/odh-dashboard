import {
  PodAffinity,
  ContainerResources,
  PodToleration,
  TolerationSettings,
  ContainerResourceAttributes,
} from '../../types';

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
  const tolerations: PodToleration[] = [];
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
    tolerations.push({
      effect: 'NoSchedule',
      key: 'nvidia.com/gpu',
      operator: 'Exists',
    });
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
  if (tolerationSettings?.enabled) {
    tolerations.push({
      effect: 'NoSchedule',
      key: tolerationSettings.key,
      operator: 'Exists',
    });
  }
  return { affinity, tolerations, resources };
};
