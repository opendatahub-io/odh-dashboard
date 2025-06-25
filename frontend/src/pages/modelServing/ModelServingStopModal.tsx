import React from 'react';
import { Button } from '@patternfly/react-core';
import ConfirmStopModal from '#~/pages/projects/components/ConfirmStopModal';
import useStopModalPreference from './useStopModalPreference';

type ModelServingStopModalProps = {
  modelName: string;
  title: string;
  onClose: (confirmStatus: boolean) => void;
};

const ModelServingStopModal: React.FC<ModelServingStopModalProps> = ({
  modelName,
  title,
  onClose,
}) => {
  const [dontShowModalValue, setDontShowModalValue] = useStopModalPreference();

  const onBeforeClose = (confirmStatus: boolean) => {
    if (!confirmStatus) {
      setDontShowModalValue(false);
    }
    onClose(confirmStatus);
  };
  const modalActions = [
    <Button
      key="confirm"
      variant="primary"
      onClick={() => onBeforeClose(true)}
      data-testid="stop-model-button"
    >
      Stop
    </Button>,
    <Button
      key="cancel"
      variant="secondary"
      onClick={() => onBeforeClose(false)}
      data-testid="cancel-stop-model-button"
    >
      Cancel
    </Button>,
  ];
  return (
    <ConfirmStopModal
      message={
        <>
          Are you sure you want to stop <strong>{modelName}</strong>?
        </>
      }
      modalActions={modalActions}
      onBeforeClose={onBeforeClose}
      title={title}
      dataTestId="stop-model-modal"
      dontShowModalValue={dontShowModalValue}
      setDontShowModalValue={setDontShowModalValue}
    />
  );
};

export default ModelServingStopModal;
