import * as React from 'react';
import { Checkbox, Stack, StackItem } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';
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

  const modalContent = (
    <Stack hasGutter>
      <StackItem>
        Pausing <strong>{displayName}</strong> will stop the job and release its resources. Job
        progress will be lost if checkpointing is not enabled.
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
  );

  return (
    <ContentModal
      title="Pause training job?"
      titleIconVariant="warning"
      dataTestId="pause-training-job-modal"
      variant="small"
      onClose={onBeforeClose}
      contents={modalContent}
      buttonActions={[
        {
          label: 'Pause',
          onClick: onConfirm,
          variant: 'danger',
          isLoading: isPausing,
          isDisabled: isPausing,
        },
        {
          label: 'Cancel',
          onClick: onBeforeClose,
          variant: 'link',
          isDisabled: isPausing,
        },
      ]}
    />
  );
};

export default PauseTrainingJobModal;
