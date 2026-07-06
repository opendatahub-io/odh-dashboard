import React from 'react';
import { Modal, ModalBody, ModalHeader, ModalFooter } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import {
  FormTrackingEventProperties,
  TrackingOutcome,
} from '#~/concepts/analyticsTracking/trackingProperties';

interface RestoreModalProps {
  onCancel: () => void;
  onSubmit: () => Promise<void[]>;
  title: string;
  alertTitle: string;
  children: React.ReactNode;
  testId: string;
  what: 'run' | 'experiment';
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  onCancel,
  onSubmit,
  title,
  children,
  testId,
  alertTitle,
  what,
}) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  const fireFormTrackingEventForRestore = React.useCallback(
    (properties: FormTrackingEventProperties) => {
      fireFormTrackingEvent(
        what === 'run' ? 'Archived Pipeline Run Restored' : 'Archived Experiment Restored',
        properties,
      );
    },
    [what],
  );

  const onConfirm = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
      fireFormTrackingEventForRestore({ outcome: TrackingOutcome.submit, success: true });
      refreshAllAPI();
      setIsSubmitting(false);
      onCancel();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
      fireFormTrackingEventForRestore({
        outcome: TrackingOutcome.submit,
        success: false,
        error: e instanceof Error ? e.message : 'unknown error',
      });

      setIsSubmitting(false);
    }
  }, [onSubmit, fireFormTrackingEventForRestore, refreshAllAPI, onCancel]);

  return (
    <Modal isOpen variant="small" onClose={onCancel} data-testid={testId}>
      <ModalHeader title={title} />
      <ModalBody>{children}</ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onSubmit={onConfirm}
          isSubmitDisabled={isSubmitting}
          isSubmitLoading={isSubmitting}
          submitLabel="Restore"
          onCancel={onCancel}
          alertTitle={alertTitle}
          error={error}
        />
      </ModalFooter>
    </Modal>
  );
};
