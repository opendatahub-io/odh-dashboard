import * as React from 'react';
import {
  CreatingStorageObjectForNotebook,
  ExistingStorageObjectForNotebook,
  UpdateObjectAtPropAndValue,
} from '~/pages/projects/types';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import {
  useRelatedNotebooks,
  ConnectedNotebookContext,
} from '~/pages/projects/notebook/useRelatedNotebooks';
import useGenericObjectState from '~/utilities/useGenericObjectState';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import useDefaultPvcSize from './useDefaultPvcSize';

export const useCreateStorageObjectForNotebook = (
  existingData?: PersistentVolumeClaimKind,
): [
  data: CreatingStorageObjectForNotebook,
  setData: UpdateObjectAtPropAndValue<CreatingStorageObjectForNotebook>,
  resetDefaults: () => void,
] => {
  const defaultSize = useDefaultPvcSize();

  const createDataState = useGenericObjectState<CreatingStorageObjectForNotebook>({
    nameDesc: {
      name: '',
      k8sName: undefined,
      description: '',
    },
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
