import * as React from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import useNotification from '~/utilities/useNotification';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';

interface RestoreRegisteredModelModalProps {
  onCancel: () => void;
  onSubmit: () => void;
  registeredModelName: string;
}

const eventName = 'Archived Model Restored';
export const RestoreRegisteredModelModal: React.FC<RestoreRegisteredModelModalProps> = ({
  onCancel,
  onSubmit,
  registeredModelName,
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
      notification.success(`${registeredModelName} and all its versions restored.`);
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
  }, [onSubmit, onClose, notification, registeredModelName]);

  return (
    <Modal
      isOpen
      variant="small"
      onClose={onCancelClose}
      data-testid="restore-registered-model-modal"
    >
      <ModalHeader title="Restore model?" />
      <ModalBody>
        <b>{registeredModelName}</b> and all of its versions will be restored and returned to the
        registered models list.
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
