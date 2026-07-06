import * as React from 'react';
import { Checkbox, Stack, StackItem } from '@patternfly/react-core';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { RayJobKind } from '../../k8sTypes';

type PauseRayJobModalProps = {
  job?: RayJobKind;
  isPausing: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dontShowModalValue: boolean;
  setDontShowModalValue: (value: boolean) => void;
};

const PauseRayJobModal: React.FC<PauseRayJobModalProps> = ({
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

  const modalContent = (
    <Stack hasGutter>
      <StackItem>
        Pausing <strong>{displayName}</strong> will stop the job and release its resources. Job
        progress will be lost if checkpointing is not enabled.
      </StackItem>
      <StackItem>
        <Checkbox
          id="pause-ray-job-dont-show-again"
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
      title="Pause RayJob?"
      titleIconVariant="warning"
      dataTestId="pause-ray-job-modal"
      variant="small"
      onClose={onClose}
      contents={modalContent}
      buttonActions={[
        {
          label: 'Pause',
          onClick: onConfirm,
          variant: 'danger',
          isLoading: isPausing,
          isDisabled: isPausing,
          dataTestId: 'pause-ray-job-button',
        },
        {
          label: 'Cancel',
          onClick: onClose,
          variant: 'link',
          isDisabled: isPausing,
          dataTestId: 'cancel-pause-ray-job-button',
        },
      ]}
    />
  );
};

export default PauseRayJobModal;
