import * as React from 'react';
import ContentModal from '#~/components/modals/ContentModal';
import { PendingChangeType } from '#~/pages/projects/projectPermissions/types';

type DiscardChangesModalProps = {
  changeType: PendingChangeType;
  onDiscard: () => void;
  onCancel: () => void;
};

const getModalMessage = (changeType: PendingChangeType): React.ReactNode => {
  switch (changeType) {
    case PendingChangeType.Kind:
      return (
        <>
          Editing the subject kind will discard your changes. Discard changes and select the new
          subject, or cancel to continue editing.
        </>
      );
    case PendingChangeType.Clear:
    case PendingChangeType.Switch:
      return (
        <>
          Editing the subject name will discard your changes. Discard changes, or cancel to continue
          editing.
        </>
      );
    default:
      return null;
  }
};

const DiscardChangesModal: React.FC<DiscardChangesModalProps> = ({
  changeType,
  onDiscard,
  onCancel,
}) => (
  <ContentModal
    title="Discard unsaved changes?"
    onClose={onCancel}
    variant="small"
    dataTestId="discard-changes-modal"
    titleIconVariant="warning"
    contents={getModalMessage(changeType)}
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
