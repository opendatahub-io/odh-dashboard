import * as React from 'react';
import ContentModal from '#~/components/modals/ContentModal';
import {
  PendingChangeType,
  type SubjectKindSelection,
} from '#~/pages/projects/projectPermissions/types';

type DiscardChangesModalProps = {
  changeType: PendingChangeType;
  subjectKind: SubjectKindSelection;
  onDiscard: () => void;
  onCancel: () => void;
};

const getModalMessage = (
  changeType: PendingChangeType,
  subjectKind: SubjectKindSelection,
): React.ReactNode => {
  switch (changeType) {
    case PendingChangeType.Kind:
      return (
        <>
          Switching the subject kind will discard any changes you&apos;ve made in the{' '}
          <strong>Role assignment</strong> section.
        </>
      );
    case PendingChangeType.Clear:
      return (
        <>
          Clearing the {subjectKind} selection will discard any changes you&apos;ve made in the{' '}
          <strong>Role assignment</strong> section.
        </>
      );
    case PendingChangeType.Switch:
      return (
        <>
          Switching to a different {subjectKind} will discard any changes you&apos;ve made in the{' '}
          <strong>Role assignment</strong> section.
        </>
      );
    default:
      return null;
  }
};

const DiscardChangesModal: React.FC<DiscardChangesModalProps> = ({
  changeType,
  subjectKind,
  onDiscard,
  onCancel,
}) => (
  <ContentModal
    title="Discard changes"
    onClose={onCancel}
    variant="small"
    dataTestId="discard-changes-modal"
    titleIconVariant="warning"
    contents={getModalMessage(changeType, subjectKind)}
    buttonActions={[
      {
        label: 'Discard',
        onClick: onDiscard,
        variant: 'primary',
        dataTestId: 'discard-changes-confirm',
      },
      {
        label: 'Cancel',
        onClick: onCancel,
        variant: 'link',
        dataTestId: 'discard-changes-cancel',
      },
    ]}
  />
);

export default DiscardChangesModal;
