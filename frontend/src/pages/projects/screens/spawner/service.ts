import { assemblePvc, createPvc } from '../../../../api';
import { StartNotebookData, StorageData } from '../../types';
import { getVolumesByStorageData } from './spawnerUtils';

export const patchStartNotebookDataWithPvc = async (
  startNotebookData: StartNotebookData,
  storageData: StorageData,
): Promise<StartNotebookData> => {
  const { storageBindingType, storageType, creatingObject } = storageData;
  const { name: pvcName, description: pvcDescription, size } = creatingObject;
  const { volumes, volumeMounts } = getVolumesByStorageData(storageData);
  if (storageType === 'persistent' && storageBindingType.has('new')) {
    const pvcData = assemblePvc(pvcName, startNotebookData.projectName, pvcDescription, size);
    const pvc = await createPvc(pvcData);
    const newPvcName = pvc.metadata?.name;
    if (newPvcName) {
      volumes.push({ name: newPvcName, persistentVolumeClaim: { claimName: newPvcName } });
      volumeMounts.push({ mountPath: '/opt/app-root/src', name: newPvcName });
    }
  }
  return { ...startNotebookData, volumes, volumeMounts };
};
