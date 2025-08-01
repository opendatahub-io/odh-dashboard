import React from 'react';
import DeployPrefilledModelModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/DeployPrefilledModelModal';
import { ModelDeployPrefillInfo } from '@odh-dashboard/internal/pages/modelServing/screens/projects/usePrefillModelDeployModal';

export type DeployRegisteredVersionModalProps = {
  modelDeployPrefill: {
    data: ModelDeployPrefillInfo;
    loaded: boolean;
    error: Error | undefined;
  };
  onSubmit: () => void;
  onClose: () => void;
};

export const DeployRegisteredVersionModal: React.FC<DeployRegisteredVersionModalProps> = ({
  modelDeployPrefill,
  onSubmit,
  onClose,
}) => (
  <DeployPrefilledModelModal
    modelDeployPrefillInfo={modelDeployPrefill.data}
    prefillInfoLoaded={modelDeployPrefill.loaded}
    prefillInfoLoadError={modelDeployPrefill.error}
    onSubmit={onSubmit}
    onCancel={onClose}
  />
);
