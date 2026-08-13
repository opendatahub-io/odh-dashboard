import { Volume, VolumeMount } from '@odh-dashboard/k8s-core';
import { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';

const shmVolumeMount = (): VolumeMount => ({
  name: 'shm',
  mountPath: '/dev/shm',
});

const shmVolume = (): Volume => ({
  name: 'shm',
  emptyDir: { medium: 'Memory', sizeLimit: '2Gi' },
});

export const applyNIMServingRuntimeShmMounts = (
  servingRuntime: ServingRuntimeKind,
): ServingRuntimeKind => {
  const newServingRuntime = structuredClone(servingRuntime);
  newServingRuntime.spec.containers = newServingRuntime.spec.containers.map((c) => {
    const volumeMounts = c.volumeMounts ?? [];
    if (
      c.name !== 'kserve-container' ||
      volumeMounts.some((volumeMount) => volumeMount.mountPath === '/dev/shm')
    ) {
      return c;
    }
    return { ...c, volumeMounts: [...volumeMounts, shmVolumeMount()] };
  });

  newServingRuntime.spec.volumes = newServingRuntime.spec.volumes ?? [];
  if (!newServingRuntime.spec.volumes.find((volume) => volume.name === 'shm')) {
    newServingRuntime.spec.volumes.push(shmVolume());
  }

  return newServingRuntime;
};

/**
 * KServe sizes the deployment from the InferenceService's hardware profile, so the resources the
 * NIM Template declares on its containers are dead weight that fights it. Legacy NIM drops them
 * the same way when it assembles the ServingRuntime.
 */
export const removeNIMServingRuntimeResources = (
  servingRuntime: ServingRuntimeKind,
): ServingRuntimeKind => {
  const newServingRuntime = structuredClone(servingRuntime);
  newServingRuntime.spec.containers = newServingRuntime.spec.containers.map((container) => {
    const newContainer = { ...container };
    delete newContainer.resources;
    return newContainer;
  });

  return newServingRuntime;
};
