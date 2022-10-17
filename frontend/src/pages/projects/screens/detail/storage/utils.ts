import { CreatingStorageObject, ExistingStorageObject } from '../../../types';

export const checkRequiredFieldsForAddingStorage = (
  creating: CreatingStorageObject,
  existing: ExistingStorageObject,
): boolean =>
  !!(
    (creating.enabled && creating.nameDesc.name && creating.workspaceSelection) ||
    (existing.enabled && existing.project && existing.storage)
  );
