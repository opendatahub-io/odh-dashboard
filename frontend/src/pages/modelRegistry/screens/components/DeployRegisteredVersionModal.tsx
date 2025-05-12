import React from 'react';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import useRegisteredModelDeployPrefillInfo from '~/pages/modelRegistry/screens/RegisteredModels/useRegisteredModelDeployPrefillInfo';
import { bumpBothTimestamps } from '~/concepts/modelRegistry/utils/updateTimestamps';
import useRegisteredModelById from '~/concepts/modelRegistry/apiHooks/useRegisteredModelById';
import DeployPrefilledModelModal from '~/pages/modelServing/screens/projects/DeployPrefilledModelModal';
import { ModelRegistriesContext } from '~/concepts/modelRegistry/context/ModelRegistriesContext';
import { useModelRegistryAPI } from '~/concepts/modelRegistry/context/ModelRegistryPageContext';

interface DeployRegisteredVersionModalProps {
  modelVersion: ModelVersion;
  onCancel: () => void;
  onSubmit?: () => void;
}

const DeployRegisteredVersionModal: React.FC<DeployRegisteredVersionModalProps> = ({
  modelVersion,
  onCancel,
  onSubmit,
}) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const modelRegistryApi = useModelRegistryAPI();

  const [registeredModel, registeredModelLoaded, registeredModelLoadError, refreshRegisteredModel] =
    useRegisteredModelById(modelVersion.registeredModelId);

  const {
    modelDeployPrefillInfo,
    loaded: prefillInfoLoaded,
    error: prefillInfoLoadError,
  } = useRegisteredModelDeployPrefillInfo(modelVersion, preferredModelRegistry?.metadata.name);

  const loaded = prefillInfoLoaded && registeredModelLoaded;
  const loadError = prefillInfoLoadError || registeredModelLoadError;

  const handleSubmit = React.useCallback(async () => {
    if (!modelVersion.registeredModelId || !registeredModel) {
      return;
    }

    try {
      await bumpBothTimestamps(modelRegistryApi.api, registeredModel, modelVersion);
      refreshRegisteredModel();
      onSubmit?.();
    } catch (submitError) {
      throw new Error('Failed to update timestamps after deployment');
    }
  }, [modelRegistryApi.api, modelVersion, onSubmit, registeredModel, refreshRegisteredModel]);

  return (
    <DeployPrefilledModelModal
      modelDeployPrefillInfo={modelDeployPrefillInfo}
      prefillInfoLoaded={loaded}
      prefillInfoLoadError={loadError}
      projectLinkExtraUrlParams={{
        modelRegistryName: preferredModelRegistry?.metadata.name,
        registeredModelId: modelVersion.registeredModelId,
        modelVersionId: modelVersion.id,
      }}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
};

export default DeployRegisteredVersionModal;
