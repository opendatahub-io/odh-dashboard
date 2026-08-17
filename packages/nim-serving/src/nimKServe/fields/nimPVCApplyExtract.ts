import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import type { ServingContainer } from '@odh-dashboard/model-serving/shared';
import type { Volume, VolumeMount } from '@odh-dashboard/k8s-core';
import {
  NIMPVCStorageMode,
  type NIMPVCFieldValue,
} from '../../pages/deploymentWizard/fields/NIMPVCField';
import {
  KSERVE_CONTAINER_NAME,
  NIM_CACHE_MOUNT_PATH,
  NIM_CACHE_PATH_ENV,
  DEFAULT_STORAGE_SIZE_GI,
} from '../../constants';

const normalizeSubPath = (subPath: string): string | undefined => {
  const stripped = subPath.replace(/^\/+/, '');
  return stripped || undefined;
};

const addPVCVolumeToRuntime = (
  deployment: KServeDeployment,
  pvcName: string,
  subPath: string,
): KServeDeployment => {
  if (!deployment.server) {
    return deployment;
  }

  const server = structuredClone(deployment.server);
  const volume: Volume = {
    name: pvcName,
    persistentVolumeClaim: { claimName: pvcName },
  };
  const volumeMount: VolumeMount = {
    name: pvcName,
    mountPath: NIM_CACHE_MOUNT_PATH,
    subPath: normalizeSubPath(subPath),
  };

  server.spec.volumes = [
    ...(server.spec.volumes ?? []).filter((v) => v.persistentVolumeClaim?.claimName !== pvcName),
    volume,
  ];

  server.spec.containers = server.spec.containers.map((c): ServingContainer => {
    if (c.name !== KSERVE_CONTAINER_NAME) {
      return c;
    }
    const volumeMounts = (c.volumeMounts ?? []).filter(
      (vm) => vm.mountPath !== NIM_CACHE_MOUNT_PATH,
    );
    const env = (c.env ?? []).filter((e) => e.name !== NIM_CACHE_PATH_ENV);
    return {
      ...c,
      volumeMounts: [...volumeMounts, volumeMount],
      env: [...env, { name: NIM_CACHE_PATH_ENV, value: NIM_CACHE_MOUNT_PATH }],
    };
  });

  return { ...deployment, server };
};

/**
 * Writes the PVC volume, volumeMount, and NIM_CACHE_PATH env var onto the
 * KServe ServingRuntime so the NIM container can cache its model image.
 */
export const applyNIMPVCFieldData = (
  deployment: KServeDeployment,
  fieldData: NIMPVCFieldValue,
): KServeDeployment => addPVCVolumeToRuntime(deployment, fieldData.pvcName, fieldData.subPath);

/**
 * Extracts PVC field data from an existing KServe deployment by inspecting
 * the ServingRuntime's volumes for a persistentVolumeClaim whose mount path
 * matches the NIM cache path.
 */
export const extractNIMPVCFieldData = (
  deployment: KServeDeployment,
): NIMPVCFieldValue | undefined => {
  if (!deployment.server) {
    return undefined;
  }

  const kserveContainer = deployment.server.spec.containers.find(
    (c) => c.name === KSERVE_CONTAINER_NAME,
  );
  if (!kserveContainer) {
    return undefined;
  }

  const cacheMount = kserveContainer.volumeMounts?.find(
    (vm) => vm.mountPath === NIM_CACHE_MOUNT_PATH,
  );
  if (!cacheMount) {
    return undefined;
  }

  const pvcVolume = deployment.server.spec.volumes?.find(
    (v) => v.name === cacheMount.name && v.persistentVolumeClaim,
  );
  if (!pvcVolume?.persistentVolumeClaim) {
    return undefined;
  }

  return {
    storageMode: NIMPVCStorageMode.EXISTING,
    pvcName: pvcVolume.persistentVolumeClaim.claimName,
    subPath: cacheMount.subPath ?? '',
    storageClassName: '',
    storageSizeGi: DEFAULT_STORAGE_SIZE_GI,
  };
};
