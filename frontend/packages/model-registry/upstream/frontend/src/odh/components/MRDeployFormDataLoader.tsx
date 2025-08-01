import React from 'react';
import { ModelVersion } from '~/app/types';
import { ModelRegistryContext } from '~/odh/api';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { bumpBothTimestamps } from '~/app/api/updateTimestamps';
import { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';
import useRegisteredModelDeployPrefillInfo from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';

const MRDeployFormDataLoader = ({
  mv,
  renderData,
}: {
  mv: ModelVersion;
  renderData: (
    modelDeployPrefill: {
      data: ModelDeployPrefillInfo;
      loaded: boolean;
      error: Error | undefined;
    },
    onSubmit: () => void,
  ) => React.ReactNode;
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

  const modelDeployPrefill: {
    data: ModelDeployPrefillInfo;
    loaded: boolean;
    error: Error | undefined;
  } | null = loaded && !error ? { data: modelDeployPrefillInfo, loaded, error } : null;

  return modelDeployPrefill ? renderData(modelDeployPrefill, onSubmit) : null;
};

export default MRDeployFormDataLoader;
