import * as React from 'react';
import {
  PendingChangeType,
  type PendingSubjectChange,
  type SubjectKindSelection,
} from '#~/pages/projects/projectPermissions/types';

/**
 * Hook to manage discard changes confirmation logic for the assign roles form.
 *
 * Rules:
 * - Switching subject kind with unsaved changes: always prompt
 * - Clearing selection with unsaved changes: always prompt
 * - Switching subjects: prompt unless New → New (both are new users)
 */
const useDiscardChangesConfirmation = (
  hasChanges: boolean,
  currentSubjectName: string,
  currentSubjectKind: SubjectKindSelection,
  existingSubjectNames: string[],
  setSubjectKind: (kind: SubjectKindSelection) => void,
  setSubjectName: (name: string) => void,
): {
  pendingChange: PendingSubjectChange | null;
  handleSubjectKindChange: (newKind: SubjectKindSelection) => void;
  handleSubjectNameChange: (newName: string) => void;
  closeModal: (confirmed: boolean) => void;
} => {
  const [pendingChange, setPendingChange] = React.useState<PendingSubjectChange | null>(null);

  const isCurrentExisting = existingSubjectNames.includes(currentSubjectName);

  const needsConfirmation = React.useCallback(
    (change: PendingSubjectChange): boolean => {
      if (!hasChanges) {
        return false;
      }
      if (change.type === PendingChangeType.Kind || change.type === PendingChangeType.Clear) {
        return true;
      }
      // Switch: only skip confirmation for New → New
      const isNewExisting = existingSubjectNames.includes(change.newName.trim());
      return isCurrentExisting || isNewExisting;
    },
    [hasChanges, existingSubjectNames, isCurrentExisting],
  );

  const applyChange = React.useCallback(
    (change: PendingSubjectChange) => {
      if (change.type === PendingChangeType.Kind) {
        setSubjectKind(change.newKind);
        setSubjectName('');
      } else if (change.type === PendingChangeType.Clear) {
        setSubjectName('');
      } else {
        setSubjectName(change.newName);
      }
    },
    [setSubjectKind, setSubjectName],
  );

  const handleSubjectKindChange = React.useCallback(
    (newKind: SubjectKindSelection) => {
      if (newKind === currentSubjectKind) {
        return;
      }
      const change: PendingSubjectChange = { type: PendingChangeType.Kind, newKind };
      if (needsConfirmation(change)) {
        setPendingChange(change);
      } else {
        applyChange(change);
      }
    },
    [currentSubjectKind, needsConfirmation, applyChange],
  );

  const handleSubjectNameChange = React.useCallback(
    (newName: string) => {
      if (!currentSubjectName) {
        setSubjectName(newName);
        return;
      }
      if (newName.trim() === currentSubjectName) {
        return;
      }
      // Empty string = clear action
      const change: PendingSubjectChange = newName
        ? { type: PendingChangeType.Switch, newName }
        : { type: PendingChangeType.Clear };

      if (needsConfirmation(change)) {
        setPendingChange(change);
      } else {
        applyChange(change);
      }
    },
    [currentSubjectName, needsConfirmation, applyChange, setSubjectName],
  );

  const closeModal = React.useCallback(
    (confirmed: boolean) => {
      if (confirmed && pendingChange) {
        applyChange(pendingChange);
      }
      setPendingChange(null);
    },
    [pendingChange, applyChange],
  );

  return {
    pendingChange,
    handleSubjectKindChange,
    handleSubjectNameChange,
    closeModal,
  };
};

export default useDiscardChangesConfirmation;
