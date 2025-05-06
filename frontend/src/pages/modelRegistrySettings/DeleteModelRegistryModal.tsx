import React from 'react';
import {
  Content,
  TextInput,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { ModelRegistryKind } from '~/k8sTypes';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import { deleteModelRegistryBackend } from '~/services/modelRegistrySettingsService';
import { fireFormTrackingEvent } from '~/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '~/concepts/analyticsTracking/trackingProperties';

type DeleteModelRegistryModalProps = {
  modelRegistry: ModelRegistryKind;
  onClose: () => void;
  refresh: () => Promise<unknown>;
};

const eventName = 'Model Registry Deleted';
const DeleteModelRegistryModal: React.FC<DeleteModelRegistryModalProps> = ({
  modelRegistry: mr,
  onClose,
  refresh,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [confirmInputValue, setConfirmInputValue] = React.useState('');
  const isDisabled = confirmInputValue.trim() !== mr.metadata.name || isSubmitting;

  const onBeforeClose = () => {
    setConfirmInputValue('');
    setIsSubmitting(false);
    setError(undefined);
    onClose();
  };

  const onCancelClose = () => {
    fireFormTrackingEvent(eventName, {
      outcome: TrackingOutcome.cancel,
    });
    onBeforeClose();
  };

  const onConfirm = async () => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      await deleteModelRegistryBackend(mr.metadata.name);
      await refresh();
      fireFormTrackingEvent(eventName, {
        outcome: TrackingOutcome.submit,
        success: true,
      });
      onBeforeClose();
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
  };

  return (
    <Modal data-testid="delete-mr-modal" isOpen onClose={onClose} variant="medium">
      <ModalHeader title="Delete model registry?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Content>
              <Content component="p">
                The <strong>{mr.metadata.name}</strong> model registry, its default group, and any
                permissions associated with it will be deleted. Data located in the database
                connected to the registry will be unaffected.
              </Content>
              <Content component="p">
                Type <strong>{mr.metadata.name}</strong> to confirm deletion:
              </Content>
            </Content>
          </StackItem>
          <StackItem>
            <TextInput
              id="confirm-delete-input"
              data-testid="confirm-delete-input"
              aria-label="Confirm delete input"
              value={confirmInputValue}
              onChange={(_e, newValue) => setConfirmInputValue(newValue)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isDisabled) {
                  onConfirm();
                }
              }}
            />
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Delete model registry"
          submitButtonVariant="danger"
          onSubmit={onConfirm}
          onCancel={onCancelClose}
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={isDisabled}
          error={error}
          alertTitle="Error deleting model registry"
        />
      </ModalFooter>
    </Modal>
  );
};

export default DeleteModelRegistryModal;
