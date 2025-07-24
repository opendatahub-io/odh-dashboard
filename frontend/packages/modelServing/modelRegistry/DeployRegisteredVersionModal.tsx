import React from 'react';
import DeployPrefilledModelModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/DeployPrefilledModelModal';
import { ModelDeployPrefillInfo } from '@odh-dashboard/internal/pages/modelServing/screens/projects/usePrefillModelDeployModal.js';

export type DeployRegisteredVersionModalProps = {
  data: {
    modelDeployPrefillInfo: ModelDeployPrefillInfo;
    loaded: boolean;
    error: Error | undefined;
    onSubmit: () => void;
  };
  onClose: () => void;
};

export const DeployRegisteredVersionModal: React.FC<DeployRegisteredVersionModalProps> = ({
  data,
  onClose,
}) => {
  const { modelDeployPrefillInfo, loaded, error, onSubmit } = data;

  return (
    <DeployPrefilledModelModal
      modelDeployPrefillInfo={modelDeployPrefillInfo}
      prefillInfoLoaded={loaded}
      prefillInfoLoadError={error}
      projectLinkExtraUrlParams={{
        modelRegistryName: modelDeployPrefillInfo.modelRegistryInfo?.mrName,
        registeredModelId: modelDeployPrefillInfo.modelRegistryInfo?.registeredModelId,
        modelVersionId: modelDeployPrefillInfo.modelRegistryInfo?.modelVersionId,
      }}
      onSubmit={onSubmit}
      onCancel={onClose}
    />
  );
};

export default DeployRegisteredVersionModal;
