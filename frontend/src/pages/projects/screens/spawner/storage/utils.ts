import { DEFAULT_PVC_SIZE } from '../../../const';
import { UpdateObjectAtPropAndValue } from '../../../types';
import { StorageData } from '../../../types';
import useGenericObjectState from '../../../useGenericObjectState';

export const useStorageDataObject = (
  storageType: 'ephemeral' | 'persistent',
  storageBindingType?: 'new' | 'existing',
  defaultWorkspaceSelection?: string,
): [StorageData, UpdateObjectAtPropAndValue<StorageData>] =>
  useGenericObjectState<StorageData>({
    storageType,
    creating: {
      nameDesc: {
        name: '',
        description: '',
      },
      size: DEFAULT_PVC_SIZE,
      workspaceSelection: defaultWorkspaceSelection,
      enabled: storageBindingType === 'new',
    },
    existing: {
      project: undefined,
      storage: undefined,
      enabled: storageBindingType === 'existing',
    },
  });
