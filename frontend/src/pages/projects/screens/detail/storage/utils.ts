import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import { ClusterStorageNotebookSelection, StorageData } from '~/pages/projects/types';
import { MOUNT_PATH_PREFIX } from '~/pages/projects/screens/spawner/storage/const';
import { MountPathFormat } from '~/pages/projects/screens/spawner/storage/types';
import { getNotebookPVCMountPathMap } from '~/pages/projects/notebook/utils';

type Status = 'error' | 'warning' | 'info' | null;
export const getFullStatusFromPercentage = (percentageFull: number): Status => {
  if (percentageFull === 100) {
    return 'error';
  }
  if (percentageFull >= 95) {
    return 'warning';
  }
  if (percentageFull >= 90) {
    return 'info';
  }
  return null;
};

export const isPvcUpdateRequired = (
  existingPvc: PersistentVolumeClaimKind,
  storageData: StorageData,
): boolean =>
  getDisplayNameFromK8sResource(existingPvc) !== storageData.name ||
  getDescriptionFromK8sResource(existingPvc) !== storageData.description ||
  existingPvc.spec.resources.requests.storage !== storageData.size ||
  existingPvc.spec.storageClassName !== storageData.storageClassName;

export const handleConnectedNotebooks = (
  tempData: ClusterStorageNotebookSelection[],
  notebooks: NotebookKind[],
): {
  updatedNotebooks: ClusterStorageNotebookSelection[];
  removedNotebooks: string[];
} => {
  const updatedNotebooks: ClusterStorageNotebookSelection[] = [];
  const removedNotebooks: string[] = [];
  notebooks.forEach((notebook) => {
    const tempEntry = tempData.find(
      (item) => item.existingPvc && item.name === notebook.metadata.name,
    );
    if (!tempEntry) {
      removedNotebooks.push(notebook.metadata.name);
    } else if (tempEntry.isUpdatedValue) {
      updatedNotebooks.push(tempEntry);
    }
  });

  return { updatedNotebooks, removedNotebooks };
};

export const mountPathSuffix = (mountPath: string): string =>
  mountPath.startsWith(MOUNT_PATH_PREFIX)
    ? mountPath.slice(MOUNT_PATH_PREFIX.length)
    : mountPath.slice(1);

export const mountPathFormat = (mountPath: string): MountPathFormat =>
  mountPath.startsWith(MOUNT_PATH_PREFIX) ? MountPathFormat.STANDARD : MountPathFormat.CUSTOM;

export const isMountPathFormat = (value: string): value is MountPathFormat =>
  value === MountPathFormat.STANDARD || value === MountPathFormat.CUSTOM;

export const validateClusterMountPath = (value: string, inUseMountPaths: string[]): string => {
  const format = value.startsWith(MOUNT_PATH_PREFIX)
    ? MountPathFormat.STANDARD
    : MountPathFormat.CUSTOM;

  if (value === '/' && format === MountPathFormat.CUSTOM) {
    return 'Enter a path to a model or folder. This path cannot point to a root folder.';
  }

  // Regex to allow empty string for Standard format
  const regex =
    format === MountPathFormat.STANDARD
      ? /^(\/?[a-z0-9-]+(\/[a-z0-9-]+)*\/?|)$/
      : /^(\/?[a-z0-9-]+(\/[a-z0-9-]+)*\/?)?$/;

  if (!regex.test(value)) {
    return 'Must consist of lowercase letters, numbers and hyphens (-). Use slashes (/) to indicate the subdirectories';
  }

  if (
    inUseMountPaths.includes(value) ||
    (format === MountPathFormat.STANDARD &&
      inUseMountPaths.includes(`${MOUNT_PATH_PREFIX}${value}`)) ||
    (format === MountPathFormat.CUSTOM && inUseMountPaths.includes(`/${value}`))
  ) {
    return `This path is already connected to this workbench, Try a different folder name`;
  }

  return '';
};

export const getInUseMountPaths = (
  currentNotebookName: string,
  availableNotebooks: NotebookKind[],
  existingPvcName?: string,
): string[] => {
  const allInUseMountPaths = getNotebookPVCMountPathMap(
    availableNotebooks.find((notebook) => notebook.metadata.name === currentNotebookName),
  );

  return Object.keys(allInUseMountPaths)
    .filter((key) => key !== existingPvcName)
    .map((key) => allInUseMountPaths[key]);
};

export const getDefaultMountPathFromStorageName = (
  storageName?: string,
  newRowId?: number,
): string =>
  storageName
    ? `${MOUNT_PATH_PREFIX}${storageName.toLowerCase().replace(/\s+/g, '-')}-${newRowId ?? 1}`
    : MOUNT_PATH_PREFIX;
