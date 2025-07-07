import React from 'react';
import {
  ModelArtifactList,
  ModelVersion,
  RegisteredModel,
} from '@odh-dashboard/internal/concepts/modelRegistry/types';
import { bumpBothTimestamps } from '@odh-dashboard/internal/concepts/modelRegistry/utils/updateTimestamps';
import DeployPrefilledModelModal from '@odh-dashboard/internal/pages/modelServing/screens/projects/DeployPrefilledModelModal';
import { ModelRegistriesContext } from '@odh-dashboard/internal/concepts/modelRegistry/context/ModelRegistriesContext';
import { useMakeFetchObject } from '@odh-dashboard/internal/utilities/useMakeFetchObject';
/* eslint-disable-next-line import/no-extraneous-dependencies */
import {
  useModelArtifactsByVersionId,
  useModelRegistryAPI,
  useRegisteredModelById,
} from '@mf/modelRegistry/api';
import useRegisteredModelDeployPrefillInfo from './useRegisteredModelDeployPrefillInfo';

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
  const modelRegistryApi = useModelRegistryAPI();
  const registeredModelState = useMakeFetchObject<RegisteredModel | null>(
    useRegisteredModelById(modelVersion.registeredModelId),
  );
  const modelArtifactListState = useMakeFetchObject<ModelArtifactList>(
    useModelArtifactsByVersionId(modelVersion.id),
  );
  const {
    data: registeredModel,
    loaded: registeredModelLoaded,
    error: registeredModelLoadError,
  } = registeredModelState;
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);

  const {
    modelDeployPrefillInfo,
    loaded: prefillInfoLoaded,
    error: prefillInfoLoadError,
  } = useRegisteredModelDeployPrefillInfo(
    modelVersion,
    registeredModelState,
    modelArtifactListState,
    preferredModelRegistry?.metadata.name,
  );

  const loaded = registeredModelLoaded && prefillInfoLoaded;
  const loadError = registeredModelLoadError || prefillInfoLoadError;

  const handleSubmit = React.useCallback(async () => {
    if (!modelVersion.registeredModelId || !registeredModel) {
      return;
    }

    try {
      await bumpBothTimestamps(modelRegistryApi.api, registeredModel, modelVersion);
      onSubmit?.();
    } catch (submitError) {
      throw new Error('Failed to update timestamps after deployment');
    }
  }, [modelRegistryApi.api, modelVersion, onSubmit, registeredModel]);

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
