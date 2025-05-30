import * as React from 'react';
import {
  CreatingStorageObjectForNotebook,
  ExistingStorageObjectForNotebook,
  StorageData,
  UpdateObjectAtPropAndValue,
} from '#~/pages/projects/types';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '#~/pages/projects/notebook/useRelatedNotebooks';
import useGenericObjectState from '#~/utilities/useGenericObjectState';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '#~/concepts/k8s/utils';
import useDefaultPvcSize from './useDefaultPvcSize';
import { MountPathFormat } from './types';
import { MOUNT_PATH_PREFIX } from './const';

export const useCreateStorageObject = (
  existingData?: PersistentVolumeClaimKind,
  formData?: StorageData,
): [data: StorageData, setData: UpdateObjectAtPropAndValue<StorageData>] => {
  const size = useDefaultPvcSize();

  const createStorageData = {
    name: formData?.name || (existingData ? getDisplayNameFromK8sResource(existingData) : ''),
    k8sName: formData?.k8sName || (existingData ? existingData.metadata.name : ''),
    description:
      formData?.description || (existingData ? getDescriptionFromK8sResource(existingData) : ''),
    size: formData?.size || (existingData ? existingData.spec.resources.requests.storage : size),
    storageClassName: formData?.storageClassName || existingData?.spec.storageClassName,
    existingPvc: existingData,
  };

  const [data, setData] = useGenericObjectState<StorageData>(createStorageData);

  return [data, setData];
};

export const useCreateStorageObjectForNotebook = (
  existingData?: PersistentVolumeClaimKind,
): [
  data: CreatingStorageObjectForNotebook,
  setData: UpdateObjectAtPropAndValue<CreatingStorageObjectForNotebook>,
  resetDefaults: () => void,
] => {
  const defaultSize = useDefaultPvcSize();

  const createDataState = useGenericObjectState<CreatingStorageObjectForNotebook>({
    name: '',
    k8sName: undefined,
    description: '',
    size: defaultSize,
    forNotebook: {
      name: '',
      mountPath: {
        value: '',
        error: '',
      },
    },
    hasExistingNotebookConnections: false,
  });

  const [, setCreateData] = createDataState;

  const existingName = existingData ? getDisplayNameFromK8sResource(existingData) : '';
  const existingDescription = existingData ? getDescriptionFromK8sResource(existingData) : '';
  const existingSize = existingData ? existingData.spec.resources.requests.storage : defaultSize;
  const existingStorageClassName = existingData?.spec.storageClassName;
  const { notebooks: relatedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.REMOVABLE_PVC,
    existingData ? existingData.metadata.name : undefined,
  );

  const hasExistingNotebookConnections = relatedNotebooks.length > 0;

  React.useEffect(() => {
    if (existingName) {
      setCreateData('name', existingName);
      setCreateData('description', existingDescription);
      setCreateData('hasExistingNotebookConnections', hasExistingNotebookConnections);
      setCreateData('size', existingSize);
      setCreateData('storageClassName', existingStorageClassName);
    }
  }, [
    existingName,
    existingDescription,
    setCreateData,
    hasExistingNotebookConnections,
    existingSize,
    existingStorageClassName,
  ]);

  return createDataState;
};

export const useExistingStorageDataObjectForNotebook = (): [
  data: ExistingStorageObjectForNotebook,
  setData: UpdateObjectAtPropAndValue<ExistingStorageObjectForNotebook>,
  resetDefaults: () => void,
] =>
  useGenericObjectState<ExistingStorageObjectForNotebook>({
    name: '',
    mountPath: {
      value: '',
      error: '',
    },
  });

// Returns the initial mount path format based on the isCreate and mountPath props.
export const useMountPathFormat = (
  isCreate: boolean,
  mountPath: string,
  initialFormat?: MountPathFormat,
): [MountPathFormat, React.Dispatch<React.SetStateAction<MountPathFormat>>] => {
  const getInitialFormat = React.useCallback(() => {
    if (isCreate && !mountPath) {
      return MountPathFormat.STANDARD;
    }
    return mountPath.startsWith(MOUNT_PATH_PREFIX)
      ? MountPathFormat.STANDARD
      : MountPathFormat.CUSTOM;
  }, [isCreate, mountPath]);

  const [format, setFormat] = React.useState(initialFormat || getInitialFormat());

  React.useEffect(() => {
    if (!isCreate) {
      const newFormat = mountPath.startsWith(MOUNT_PATH_PREFIX)
        ? MountPathFormat.STANDARD
        : MountPathFormat.CUSTOM;
      setFormat(newFormat);
    }
  }, [isCreate, mountPath]);

  return [format, setFormat];
};

// Validates the mount path for a storage object.
export const validateMountPath = (value: string, inUseMountPaths: string[]): string => {
  const format = value.startsWith(MOUNT_PATH_PREFIX)
    ? MountPathFormat.STANDARD
    : MountPathFormat.CUSTOM;

  if (!value.length && format === MountPathFormat.CUSTOM) {
    return 'Enter a path to a model or folder. This path cannot point to a root folder.';
  }

  // Regex to allow empty string for Standard format
  const regex =
    format === MountPathFormat.STANDARD
      ? /^(\/?[a-z0-9-]+(\/[a-z0-9-]+)*\/?|)$/
      : /^(\/?[a-z0-9-]+(\/[a-z0-9-]+)*\/?)?$/;

  if (!regex.test(value)) {
    return 'Must only consist of lowercase letters, dashes, numbers and slashes.';
  }

  if (
    inUseMountPaths.includes(value) ||
    (format === MountPathFormat.STANDARD &&
      inUseMountPaths.includes(`${MOUNT_PATH_PREFIX}${value}`)) ||
    (format === MountPathFormat.CUSTOM && inUseMountPaths.includes(`/${value}`))
  ) {
    return 'Mount path is already in use for this workbench.';
  }

  return '';
};
