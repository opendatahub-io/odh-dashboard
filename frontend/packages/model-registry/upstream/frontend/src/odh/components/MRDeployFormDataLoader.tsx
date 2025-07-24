import React from 'react';
import { ModelVersion } from '~/app/types';
import { ModelRegistryContext } from '~/odh/api';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { bumpBothTimestamps } from '~/app/api/updateTimestamps';
import { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';
import useRegisteredModelDeployPrefillInfo from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';

const MRDeployFormDataLoader = ({
  mv,
  mvLoaded,
  mvError,
  renderData,
}: {
  mv: ModelVersion;
  mvLoaded: boolean;
  mvError: Error | undefined;
  renderData: (data: {
    modelDeployPrefillInfo: ModelDeployPrefillInfo;
    loaded: boolean;
    error: Error | undefined;
    onSubmit: () => void;
  }) => React.ReactNode;
}) => {
  const { apiState } = React.useContext(ModelRegistryContext);
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const prefillInfo = useRegisteredModelDeployPrefillInfo(mv, preferredModelRegistry?.name);
  const { modelDeployPrefillInfo, registeredModel, loaded, error } = prefillInfo;

  const onSubmit = React.useCallback(async () => {
    if (!registeredModel) {
      return;
    }
    try {
      await bumpBothTimestamps(apiState.api, registeredModel, mv);
    } catch (submitError) {
      throw new Error('Failed to update timestamps after deployment');
    }
  }, [apiState.api, mv, registeredModel]);

  const data: {
    modelDeployPrefillInfo: ModelDeployPrefillInfo;
    loaded: boolean;
    error: Error | undefined;
    onSubmit: () => void;
  } | null =
    loaded && !error && mvLoaded && !mvError
      ? { modelDeployPrefillInfo, loaded, error, onSubmit }
      : null;

  return data ? renderData(data) : null;
};

export default MRDeployFormDataLoader;
