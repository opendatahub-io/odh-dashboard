import { assemblePvc, createPvc } from '../../../../api';
import { Volume, VolumeMount } from '../../../../types';
import { StorageData } from '../../types';
import { getVolumesByStorageData } from './spawnerUtils';

export const createPvcDataForNotebook = async (
  projectName: string,
  storageData: StorageData,
): Promise<{ volumes: Volume[]; volumeMounts: VolumeMount[] }> => {
  const { storageType, creating } = storageData;
  const {
    nameDesc: { name: pvcName, description: pvcDescription },
    size,
  } = creating;
  const { volumes, volumeMounts } = getVolumesByStorageData(storageData);
  if (storageType === 'persistent' && creating.enabled) {
    const pvcData = assemblePvc(pvcName, projectName, pvcDescription, size);
    const pvc = await createPvc(pvcData);
    const newPvcName = pvc.metadata.name;
    volumes.push({ name: newPvcName, persistentVolumeClaim: { claimName: newPvcName } });
    volumeMounts.push({ mountPath: '/opt/app-root/src', name: newPvcName });
  }
  return { volumes, volumeMounts };
};
