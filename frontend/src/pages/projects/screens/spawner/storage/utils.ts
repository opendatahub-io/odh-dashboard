import { DEFAULT_PVC_SIZE } from '../../../const';
import {
  CreatingStorageObjectForNotebook,
  ExistingStorageObjectForNotebook,
  StorageData,
  StorageType,
  UpdateObjectAtPropAndValue,
} from '../../../types';
import { getPvcDescription, getPvcDisplayName } from '../../../utils';
import * as React from 'react';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';
import useRelatedNotebooks, {
  ConnectedNotebookContext,
} from '../../../notebook/useRelatedNotebooks';
import useGenericObjectState from '../../../../../utilities/useGenericObjectState';

export const getRelatedNotebooksArray = (relatedNotebooksAnnotation: string): string[] => {
  try {
    return JSON.parse(relatedNotebooksAnnotation);
  } catch (e) {
    return [];
  }
};

export const useCreateStorageObjectForNotebook = (
  existingData?: PersistentVolumeClaimKind,
): [
  data: CreatingStorageObjectForNotebook,
  setData: UpdateObjectAtPropAndValue<CreatingStorageObjectForNotebook>,
  resetDefaults: () => void,
] => {
  const createDataState = useGenericObjectState<CreatingStorageObjectForNotebook>({
    nameDesc: {
      name: '',
      description: '',
    },
    size: DEFAULT_PVC_SIZE,
    forNotebook: {
      name: '',
      mountPath: {
        value: '',
        error: '',
      },
    },
    existingNotebooks: [],
    hasExistingNotebookConnections: false,
  });

  const [, setCreateData] = createDataState;

  const existingName = existingData ? getPvcDisplayName(existingData) : '';
  const existingDescription = existingData ? getPvcDescription(existingData) : '';
  const existingSize = existingData ? existingData.spec.resources.requests.storage : '';
  const { connectedNotebooks: relatedNotebooks } = useRelatedNotebooks(
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
      setCreateData(
        'existingNotebooks',
        relatedNotebooks.map((notebook) => notebook.metadata.name),
      );

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
] =>
  useGenericObjectState<StorageData>({
    storageType,
    creating: {
      nameDesc: {
        name: '',
        description: '',
      },
      size: DEFAULT_PVC_SIZE,
    },
    existing: {
      storage: '',
    },
  });
