import { DEFAULT_PVC_SIZE } from '../../../const';
import { UpdateObjectAtPropAndValue } from '../../../typeHelpers';
import { StorageData } from '../../../types';
import useGenericObjectState from '../../../useGenericObjectState';

export const useStorageDataObject = (
  storageType: 'ephemeral' | 'persistent',
  storageBindingType?: 'new' | 'existing',
): [StorageData, UpdateObjectAtPropAndValue<StorageData>] =>
  useGenericObjectState<StorageData>({
    storageType,
    creating: {
      nameDesc: {
        name: '',
        description: '',
      },
      size: DEFAULT_PVC_SIZE,
      workspaceSelections: [],
      enabled: storageBindingType === 'new',
    },
    existing: {
      project: undefined,
      storage: undefined,
      enabled: storageBindingType === 'existing',
    },
  });
