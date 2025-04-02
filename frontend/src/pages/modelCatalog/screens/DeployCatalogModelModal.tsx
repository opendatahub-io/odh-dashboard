import React from 'react';
import { CatalogModel } from '~/concepts/modelCatalog/types';
import { ModelDeployPrefillInfo } from '~/pages/modelServing/screens/projects/usePrefillModelDeployModal';
import DeployPrefilledModelModal from '~/pages/modelServing/screens/projects/DeployPrefilledModelModal';
import { ProjectKind } from '~/k8sTypes';
import { uriToConnectionTypeName } from '~/concepts/modelRegistry/utils';

interface DeployCatalogModelModalProps {
  model: CatalogModel;
  onCancel: () => void;
  onSubmit?: (selectedProject: ProjectKind) => void;
}

const DeployCatalogModelModal: React.FC<DeployCatalogModelModalProps> = ({
  model,
  onCancel,
  onSubmit,
}) => {
  const uri = model.artifacts?.[0].uri;
  const modelDeployPrefillInfo: ModelDeployPrefillInfo = {
    modelName: model.name,
    modelArtifactUri: uri,
    connectionTypeName: uriToConnectionTypeName(uri),
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
