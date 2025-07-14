import React from 'react';
import { ServingRuntimePlatform } from '#~/types';
import { ModelServingContext } from '#~/pages/modelServing/ModelServingContext';

const useProjectErrorForPrefilledModel = (
  projectName?: string,
  platform?: ServingRuntimePlatform,
): { loaded: boolean; error: Error | undefined } => {
  const {
    servingRuntimes: { data: servingRuntimes, loaded, error },
  } = React.useContext(ModelServingContext);

  // If project is not selected, there is no error
  if (!projectName) {
    return { loaded: true, error: undefined };
  }

  // If the platform is not selected
  if (!platform) {
    return {
      loaded,
      error: new Error(
        'To deploy a model, you must first select a model serving platform for this project.',
      ),
    };
  }

  if (error) {
    return { loaded: true, error };
  }

  // If the platform is MULTI but it doesn't have a server
  if (platform === ServingRuntimePlatform.MULTI) {
    if (loaded && servingRuntimes.items.length === 0) {
      return {
        loaded,
        error: new Error('To deploy a model, you must first configure a model server.'),
      };
    }
  }

  return { loaded, error: undefined };
};

export default useProjectErrorForPrefilledModel;
