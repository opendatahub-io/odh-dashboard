import React from 'react';
import type { ButtonAction } from '@odh-dashboard/ui-core';
import { ConfirmStopModal } from '@odh-dashboard/ui-core';
import useStopModalPreference from '../../concepts/useStopModalPreference';

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

  const buttonActions: ButtonAction[] = [
    {
      label: 'Stop model deployment',
      onClick: () => onBeforeClose(true),
      variant: 'primary',
      dataTestId: 'stop-model-button',
    },
    {
      label: 'Cancel',
      onClick: () => onBeforeClose(false),
      variant: 'secondary',
      dataTestId: 'cancel-stop-model-button',
    },
  ];

  return (
    <ConfirmStopModal
      message={
        <>
          The <strong>{modelName}</strong> model deployment will be shut down and will not use
          resources until it is restarted. The model endpoint will no longer be available as an AI
          asset or MaaS.
        </>
      }
      buttonActions={buttonActions}
      onBeforeClose={onBeforeClose}
      title={title}
      dataTestId="stop-model-modal"
      dontShowModalValue={dontShowModalValue}
      setDontShowModalValue={setDontShowModalValue}
    />
  );
};

export default ModelServingStopModal;
