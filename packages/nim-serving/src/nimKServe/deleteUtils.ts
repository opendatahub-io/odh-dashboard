import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import { KSERVE_CONTAINER_NAME, NIM_CACHE_MOUNT_PATH } from '../constants';

export type NIMKServePVCReference = {
  name: string;
  namespace: string;
};

/** Returns the legacy NIM cache PVC mounted by the selected ServingRuntime. */
export const getNIMKServePVCReference = (
  deployment: KServeDeployment,
): NIMKServePVCReference | undefined => {
  const {
    model: { metadata: modelMetadata },
    server,
  } = deployment;
  const { namespace } = modelMetadata;
  if (!namespace || !server) {
    return undefined;
  }

  const kserveContainer = server.spec.containers.find(
    (container) => container.name === KSERVE_CONTAINER_NAME,
  );
  const cacheMount = kserveContainer?.volumeMounts?.find(
    (volumeMount) => volumeMount.mountPath === NIM_CACHE_MOUNT_PATH,
  );
  if (!cacheMount) {
    return undefined;
  }

  const pvcVolume = server.spec.volumes?.find(
    (volume) => volume.name === cacheMount.name && volume.persistentVolumeClaim,
  );
  const pvcName = pvcVolume?.persistentVolumeClaim?.claimName;
  if (!pvcName || typeof pvcName !== 'string') {
    return undefined;
  }

  return { name: pvcName, namespace };
};
