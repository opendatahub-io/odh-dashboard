import { CreatingStorageObject, ExistingStorageObject } from '../../../types';

export const checkRequiredFieldsForAddingStorage = (
  creating: CreatingStorageObject,
  existing: ExistingStorageObject,
): boolean =>
  !!(
    (creating.enabled && creating.nameDesc.name && creating.workspaceSelections.length !== 0) ||
    (existing.enabled && existing.project && existing.storage)
  );
