import * as React from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import useNotification from '#~/utilities/useNotification';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';

interface RestoreModelVersionModalProps {
  onCancel: () => void;
  onSubmit: () => void;
  modelVersionName: string;
}

const eventName = 'Archived Model Version Restored';
export const RestoreModelVersionModal: React.FC<RestoreModelVersionModalProps> = ({
  onCancel,
  onSubmit,
  modelVersionName,
}) => {
  const notification = useNotification();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  const onClose = React.useCallback(() => {
    onCancel();
  }, [onCancel]);

  const onCancelClose = React.useCallback(() => {
    fireFormTrackingEvent(eventName, { outcome: TrackingOutcome.cancel });
    onClose();
  }, [onClose]);

  const onConfirm = React.useCallback(async () => {
    setIsSubmitting(true);

    try {
      await onSubmit();
      fireFormTrackingEvent(eventName, {
        outcome: TrackingOutcome.submit,
        success: true,
      });
      onClose();
      notification.success(`${modelVersionName} restored.`);
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
      fireFormTrackingEvent(eventName, {
        outcome: TrackingOutcome.submit,
        success: false,
        error: e instanceof Error ? e.message : 'unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, onClose, notification, modelVersionName]);

  return (
    <Modal isOpen variant="small" onClose={onCancelClose} data-testid="restore-model-version-modal">
      <ModalHeader title="Restore model version?" />
      <ModalBody>
        <b>{modelVersionName}</b> will be restored and returned to the versions list.
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onCancelClose}
          onSubmit={onConfirm}
          submitLabel="Restore"
          isSubmitLoading={isSubmitting}
          error={error}
          alertTitle="Error"
          isSubmitDisabled={isSubmitting}
        />
      </ModalFooter>
    </Modal>
  );
};
