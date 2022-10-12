import { CreatingStorageObject, ExistingStorageObject } from '../../types';

export const checkRequiredFieldsForAddingStorage = (
  storageType: 'new' | 'existing',
  creating: CreatingStorageObject,
  existing: ExistingStorageObject,
): boolean =>
  !!(
    (storageType === 'new' &&
      creating.nameDesc.name &&
      creating.workspaceSelections.length !== 0) ||
    (storageType === 'existing' && existing.project && existing.storage)
  );
