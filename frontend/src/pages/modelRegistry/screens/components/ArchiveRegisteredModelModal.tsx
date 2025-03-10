import * as React from 'react';
import { Flex, FlexItem, Stack, StackItem, TextInput } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import useNotification from '~/utilities/useNotification';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';

interface ArchiveRegisteredModelModalProps {
  onCancel: () => void;
  onSubmit: () => void;
  registeredModelName: string;
}

const eventName = 'Registered Model Archived';
export const ArchiveRegisteredModelModal: React.FC<ArchiveRegisteredModelModalProps> = ({
  onCancel,
  onSubmit,
  registeredModelName,
}) => {
  const notification = useNotification();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [confirmInputValue, setConfirmInputValue] = React.useState('');
  const isDisabled = confirmInputValue.trim() !== registeredModelName || isSubmitting;

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
      notification.success(`${registeredModelName} and all its versions archived.`);
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
      fireFormTrackingEvent(eventName, {
        outcome: TrackingOutcome.submit,
        success: true,
        error: e instanceof Error ? e.message : 'unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, onClose, notification, registeredModelName]);

  return (
    <Modal
      isOpen
      title="Archive model?"
      titleIconVariant="warning"
      variant="small"
      onClose={onCancelClose}
      footer={
        <DashboardModalFooter
          onCancel={onCancelClose}
          onSubmit={onConfirm}
          submitLabel="Archive"
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={isDisabled}
          error={error}
          alertTitle="Error"
        />
      }
      data-testid="archive-registered-model-modal"
    >
      <Stack hasGutter>
        <StackItem>
          <b>{registeredModelName}</b> and all of its versions will be archived and unavailable for
          use unless it is restored.
        </StackItem>
        <StackItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              Type <strong>{registeredModelName}</strong> to confirm archiving:
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
    </Modal>
  );
};
