import * as React from 'react';
import ContentModal from '#~/components/modals/ContentModal';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
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

const PENDING_CHANGE_TO_DISCARD_REASON: Record<PendingChangeType, string> = {
  [PendingChangeType.Kind]: 'switch_subject_kind',
  [PendingChangeType.Switch]: 'switch_subject',
  [PendingChangeType.Clear]: 'clear_input',
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
        onClick: () => {
          /* eslint-disable camelcase */
          fireMiscTrackingEvent('RBAC Subject Changed', {
            discard_reason: PENDING_CHANGE_TO_DISCARD_REASON[changeType],
          });
          /* eslint-enable camelcase */
          onDiscard();
        },
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
