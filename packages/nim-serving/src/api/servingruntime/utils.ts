import { Volume, VolumeMount } from '@odh-dashboard/k8s-core';
import { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';

const SHM_VOLUME_MOUNT: VolumeMount = {
  name: 'shm',
  mountPath: '/dev/shm',
};

const SHM_VOLUME: Volume = {
  name: 'shm',
  emptyDir: { medium: 'Memory', sizeLimit: '2Gi' },
};

export const applyNIMServingRuntimeShmMounts = (
  servingRuntime: ServingRuntimeKind,
): ServingRuntimeKind => {
  const newServingRuntime = structuredClone(servingRuntime);
  newServingRuntime.spec.containers = newServingRuntime.spec.containers.map((c) => {
    if (c.name === 'kserve-container') {
      const volumeMounts = c.volumeMounts || [];

      if (!volumeMounts.find((volumeMount) => volumeMount.mountPath === '/dev/shm')) {
        volumeMounts.push(SHM_VOLUME_MOUNT);
      }
    }
    return c;
  });

  newServingRuntime.spec.volumes = newServingRuntime.spec.volumes ?? [];
  if (!newServingRuntime.spec.volumes.find((volume) => volume.name === 'shm')) {
    newServingRuntime.spec.volumes.push(SHM_VOLUME);
  }

  return newServingRuntime;
};
