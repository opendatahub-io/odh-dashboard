import React from 'react';
import { CatalogModel } from '~/concepts/modelCatalog/types';
import { ModelDeployPrefillInfo } from '~/pages/modelServing/screens/projects/usePrefillModelDeployModal';
import DeployPrefilledModelModal from '~/pages/modelServing/screens/projects/DeployPrefilledModelModal';

interface DeployCatalogModelModalProps {
  model: CatalogModel;
  onCancel: () => void;
  onSubmit?: () => void;
}

const DeployCatalogModelModal: React.FC<DeployCatalogModelModalProps> = ({
  model,
  onCancel,
  onSubmit,
}) => {
  const modelDeployPrefillInfo: ModelDeployPrefillInfo = {
    modelName: model.name,
    modelArtifactUri: model.artifacts?.[0].uri,
    connectionTypeName: 'oci-v1', // TODO maybe get this based on the URI like in useRegisteredModelDeployPrefillInfo? Also maybe it should be from an enum?
  };
  return (
    <DeployPrefilledModelModal
      modelDeployPrefillInfo={modelDeployPrefillInfo}
      prefillInfoLoaded
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  );
};

export default DeployCatalogModelModal;
