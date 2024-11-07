import * as React from 'react';
import {
  CreatingStorageObject,
  CreatingStorageObjectForNotebook,
  ExistingStorageObjectForNotebook,
  StorageData,
  StorageType,
  UpdateObjectAtPropAndValue,
} from '~/pages/projects/types';
import { NotebookKind, PersistentVolumeClaimKind } from '~/k8sTypes';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import { getRootVolumeName } from '~/pages/projects/screens/spawner/spawnerUtils';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import useDefaultPvcSize from './useDefaultPvcSize';
import { MountPathFormat } from './types';
import { MOUNT_PATH_PREFIX } from './const';

export const useCreateStorageObject = (
  existingData?: PersistentVolumeClaimKind,
): [
  data: CreatingStorageObject,
  setData: UpdateObjectAtPropAndValue<CreatingStorageObject>,
  resetDefaults: () => void,
] => {
  const size = useDefaultPvcSize();
  const createDataState = useGenericObjectState<CreatingStorageObject>({
    nameDesc: {
      name: '',
      k8sName: undefined,
      description: '',
    },
    size,
  });

  const [, setCreateData] = createDataState;

  const existingName = existingData ? getDisplayNameFromK8sResource(existingData) : '';
  const existingDescription = existingData ? getDescriptionFromK8sResource(existingData) : '';
  const existingSize = existingData ? existingData.spec.resources.requests.storage : size;
  const existingStorageClassName = existingData?.spec.storageClassName;

  React.useEffect(() => {
    if (existingName) {
      setCreateData('nameDesc', {
        name: existingName,
        description: existingDescription,
      });
      setCreateData('size', existingSize);
      setCreateData('storageClassName', existingStorageClassName);
    }
  }, [existingName, existingDescription, setCreateData, existingSize, existingStorageClassName]);

  return createDataState;
};

export const useCreateStorageObjectForNotebook = (
  existingData?: PersistentVolumeClaimKind,
): [
  data: CreatingStorageObjectForNotebook,
  setData: UpdateObjectAtPropAndValue<CreatingStorageObjectForNotebook>,
  resetDefaults: () => void,
] => {
  const size = useDefaultPvcSize();

  const createDataState = useGenericObjectState<CreatingStorageObjectForNotebook>({
    nameDesc: {
      name: '',
      k8sName: undefined,
      description: '',
    },
    size,
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
  const existingSize = existingData ? existingData.spec.resources.requests.storage : size;
  const existingStorageClassName = existingData?.spec.storageClassName;
  const { notebooks: relatedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.REMOVABLE_PVC,
    existingData ? existingData.metadata.name : undefined,
  );

  const hasExistingNotebookConnections = relatedNotebooks.length > 0;

  React.useEffect(() => {
    if (existingName) {
      setCreateData('nameDesc', {
        name: existingName,
        description: existingDescription,
      });
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

export const useStorageDataObject = (
  notebook?: NotebookKind,
): [
  data: StorageData,
  setData: UpdateObjectAtPropAndValue<StorageData>,
  resetDefaults: () => void,
] => {
  const size = useDefaultPvcSize();
  return useGenericObjectState<StorageData>({
    storageType: notebook ? StorageType.EXISTING_PVC : StorageType.NEW_PVC,
    creating: {
      nameDesc: {
        name: '',
        description: '',
      },
      size,
      storageClassName: '',
    },
    existing: {
      storage: getRootVolumeName(notebook),
    },
  });
};

// Returns the initial mount path format based on the isCreate and mountPath props.
export const useMountPathFormat = (
  isCreate: boolean,
  mountPath: string,
): [MountPathFormat, React.Dispatch<React.SetStateAction<MountPathFormat>>] => {
  const getInitialFormat = React.useCallback(() => {
    if (isCreate) {
      return MountPathFormat.STANDARD;
    }
    return mountPath.startsWith(MOUNT_PATH_PREFIX)
      ? MountPathFormat.STANDARD
      : MountPathFormat.CUSTOM;
  }, [isCreate, mountPath]);

  const [format, setFormat] = React.useState(getInitialFormat);

  React.useEffect(() => {
    if (!isCreate) {
      const newFormat = mountPath.startsWith(MOUNT_PATH_PREFIX)
        ? MountPathFormat.STANDARD
        : MountPathFormat.CUSTOM;
      setFormat(newFormat);
    }
  }, [isCreate, mountPath]);

  return [format, setFormat] as const;
};

// Validates the mount path for a storage object.
export const validateMountPath = (
  value: string,
  inUseMountPaths: string[],
  format: MountPathFormat,
): string => {
  if (value.length === 0 && format === MountPathFormat.CUSTOM) {
    return 'Enter a path to a model or folder. This path cannot point to a root folder.';
  }

  // Regex to allow empty string for Standard format
  const regex =
    format === MountPathFormat.STANDARD
      ? /^(\/?[a-z-]+(\/[a-z-]+)*\/?|)$/
      : /^(\/?[a-z-]+(\/[a-z-]+)*\/?)$/;

  if (!regex.test(value)) {
    return 'Must only consist of lowercase letters, dashes, and slashes.';
  }

  if (inUseMountPaths.includes(`/${value}`)) {
    return 'Mount folder is already in use for this workbench.';
  }
  return '';
};
