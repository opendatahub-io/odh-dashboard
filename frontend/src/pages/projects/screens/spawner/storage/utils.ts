import {
  CreatingStorageObjectForNotebook,
  ExistingStorageObjectForNotebook,
  StorageData,
  StorageType,
  UpdateObjectAtPropAndValue,
} from '../../../types';
import useGenericObjectState from '../../../useGenericObjectState';
import { getPvcDescription, getPvcDisplayName } from '../../../utils';
import * as React from 'react';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';
import useRelatedNotebooks, {
  ConnectedNotebookContext,
} from '../../../notebook/useRelatedNotebooks';
import useDefaultPvcSize from './useAvailablePvcSize';

export const useCreateStorageObjectForNotebook = (
  existingData?: PersistentVolumeClaimKind,
): [
  data: CreatingStorageObjectForNotebook,
  setData: UpdateObjectAtPropAndValue<CreatingStorageObjectForNotebook>,
  resetDefaults: () => void,
] => {
  const defaultPvcSize = useDefaultPvcSize();
  const createDataState = useGenericObjectState<CreatingStorageObjectForNotebook>({
    nameDesc: {
      name: '',
      k8sName: undefined,
      description: '',
    },
    size: defaultPvcSize,
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

  const existingName = existingData ? getPvcDisplayName(existingData) : '';
  const existingDescription = existingData ? getPvcDescription(existingData) : '';
  const existingSize = existingData ? existingData.spec.resources.requests.storage : '';
  const { notebooks: relatedNotebooks } = useRelatedNotebooks(
    ConnectedNotebookContext.PVC,
    existingData ? existingData.metadata.name : undefined,
  );
  React.useEffect(() => {
    if (existingName) {
      setCreateData('nameDesc', {
        name: existingName,
        description: existingDescription,
      });

      if (relatedNotebooks.length > 0) {
        setCreateData('hasExistingNotebookConnections', true);
      }

      const newSize = parseInt(existingSize);
      if (newSize) {
        setCreateData('size', newSize);
      }
    }
  }, [existingName, existingDescription, setCreateData, relatedNotebooks, existingSize]);

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
  storageType: StorageType,
): [
  data: StorageData,
  setData: UpdateObjectAtPropAndValue<StorageData>,
  resetDefaults: () => void,
] => {
  const defaultPvcSize = useDefaultPvcSize();
  return useGenericObjectState<StorageData>({
    storageType,
    creating: {
      nameDesc: {
        name: '',
        description: '',
      },
      size: defaultPvcSize,
    },
    existing: {
      storage: '',
    },
  });
};
