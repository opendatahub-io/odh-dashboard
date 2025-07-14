import * as React from 'react';
import {
  Flex,
  FlexItem,
  Stack,
  StackItem,
  TextInput,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';

interface ArchiveModalProps {
  confirmMessage: string;
  title: string;
  alertTitle: string;
  onCancel: () => void;
  onSubmit: () => Promise<void[]>;
  children: React.ReactNode;
  testId: string;
  whatToArchive: 'runs' | 'experiments';
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  onCancel,
  onSubmit,
  confirmMessage,
  title,
  alertTitle,
  children,
  testId,
  whatToArchive,
}) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [confirmInputValue, setConfirmInputValue] = React.useState('');
  const isDisabled = confirmInputValue.trim() !== confirmMessage || isSubmitting;

  const eventName =
    whatToArchive === 'runs' ? 'Pipeline Runs Archived' : 'Pipeline Experiment Archived';

  const onClose = React.useCallback(() => {
    setConfirmInputValue('');
    onCancel();
  }, [onCancel]);

  const onCancelClose = React.useCallback(() => {
    fireFormTrackingEvent(eventName, {
      outcome: TrackingOutcome.cancel,
    });
    onClose();
  }, [onClose, eventName]);

  const onConfirm = React.useCallback(async () => {
    setIsSubmitting(true);

    try {
      await onSubmit();
      fireFormTrackingEvent(eventName, { outcome: TrackingOutcome.submit, success: true });
      refreshAllAPI();
      setIsSubmitting(false);
      onClose();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
      fireFormTrackingEvent(eventName, {
        outcome: TrackingOutcome.submit,
        success: false,
        error: e instanceof Error ? e.message : 'unknown error',
      });

      setIsSubmitting(false);
    }
  }, [onSubmit, onClose, refreshAllAPI, eventName]);

  return (
    <Modal isOpen variant="small" onClose={onCancelClose} data-testid={testId}>
      <ModalHeader title={title} titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          {children}
          <StackItem>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                Type <strong>{confirmMessage}</strong> to confirm archiving:
              </FlexItem>
              <TextInput
                id="confirm-archive-input"
                data-testid="confirm-archive-input"
                aria-label="confirm archive input"
                value={confirmInputValue}
                onChange={(_e, newValue) => setConfirmInputValue(newValue)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isDisabled) {
                    onConfirm();
                  }
                }}
              />
            </Flex>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onCancelClose}
          onSubmit={onConfirm}
          submitLabel="Archive"
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={isDisabled}
          error={error}
          alertTitle={alertTitle}
        />
      </ModalFooter>
    </Modal>
  );
};
