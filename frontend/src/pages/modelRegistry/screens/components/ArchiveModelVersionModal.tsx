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
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import useNotification from '#~/utilities/useNotification';
import { fireFormTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '#~/concepts/analyticsTracking/trackingProperties';

interface ArchiveModelVersionModalProps {
  onCancel: () => void;
  onSubmit: () => void;
  modelVersionName: string;
}

const eventName = 'Model Version Archived';
export const ArchiveModelVersionModal: React.FC<ArchiveModelVersionModalProps> = ({
  onCancel,
  onSubmit,
  modelVersionName,
}) => {
  const notification = useNotification();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [confirmInputValue, setConfirmInputValue] = React.useState('');
  const isDisabled = confirmInputValue.trim() !== modelVersionName || isSubmitting;

  const onClose = React.useCallback(() => {
    setConfirmInputValue('');
    onCancel();
  }, [onCancel]);

  const onCancelClose = React.useCallback(() => {
    fireFormTrackingEvent(eventName, {
      outcome: TrackingOutcome.cancel,
    });
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
      notification.success(`${modelVersionName} archived.`);
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
    <Modal isOpen variant="small" onClose={onCancelClose} data-testid="archive-model-version-modal">
      <ModalHeader title="Archive model version?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <b>{modelVersionName}</b> will be archived and unavailable for use unless it is
            restored.
          </StackItem>
          <StackItem>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                Type <strong>{modelVersionName}</strong> to confirm archiving:
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
          alertTitle="Error"
        />
      </ModalFooter>
    </Modal>
  );
};
