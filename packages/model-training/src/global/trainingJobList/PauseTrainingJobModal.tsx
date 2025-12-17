import * as React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Checkbox,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import { TrainJobKind } from '../../k8sTypes';

type PauseTrainingJobModalProps = {
  job?: TrainJobKind;
  isPausing: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dontShowModalValue: boolean;
  setDontShowModalValue: (value: boolean) => void;
};

const PauseTrainingJobModal: React.FC<PauseTrainingJobModalProps> = ({
  job,
  isPausing,
  onClose,
  onConfirm,
  dontShowModalValue,
  setDontShowModalValue,
}) => {
  if (!job) {
    return null;
  }

  const displayName = getDisplayNameFromK8sResource(job);

  const onBeforeClose = () => {
    // Reset the checkbox if user cancels
    setDontShowModalValue(false);
    onClose();
  };

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen
      onClose={onBeforeClose}
      data-testid="pause-training-job-modal"
    >
      <ModalHeader title="Pause training job?" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            The <strong>{displayName}</strong> job will be temporarily stopped, and its resources
            will be released. Job progress and state, such as model weights and optimizer state,
            will be saved. You can resume the job from its last checkpoint at any time.
          </StackItem>
          <StackItem>
            <Checkbox
              id="dont-show-again"
              data-testid="dont-show-again-checkbox"
              label="Don't show again"
              isChecked={dontShowModalValue}
              onChange={(_e, checked) => setDontShowModalValue(checked)}
            />
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onBeforeClose}
          onSubmit={onConfirm}
          submitLabel="Pause"
          submitButtonVariant="primary"
          isSubmitLoading={isPausing}
          isSubmitDisabled={isPausing}
          isCancelDisabled={isPausing}
        />
      </ModalFooter>
    </Modal>
  );
};

export default PauseTrainingJobModal;
