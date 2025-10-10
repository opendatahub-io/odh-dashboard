import React from 'react';
import { Button } from '@patternfly/react-core';
import ConfirmStopModal from '@odh-dashboard/internal/pages/projects/components/ConfirmStopModal';
import { Deployment } from '@odh-dashboard/model-serving/extension-points';
import useStopModalPreference from '../../concepts/useStopModalPreference';
import AIAssetExpandableSection from '../shared/AIAssetExpandableSection';

type ModelServingStopModalProps = {
  modelName: string;
  title: string;
  onClose: (confirmStatus: boolean) => void;
  deployment: Deployment;
};

const ModelServingStopModal: React.FC<ModelServingStopModalProps> = ({
  modelName,
  title,
  onClose,
  deployment,
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
      Stop model deployment
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
          The <strong>{modelName}</strong> model deployment will be shut down and will not use
          resources until it is restarted.
          <AIAssetExpandableSection models={deployment.model} testIdPrefix="stop-ai-assets" />
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
