import React from 'react';
import { ServingRuntimePlatform } from '#~/types';
import { ModelServingContext } from '#~/pages/modelServing/ModelServingContext';

const useProjectErrorForPrefilledModel = (
  projectName?: string,
  platform?: ServingRuntimePlatform,
): { loaded: boolean; error: Error | undefined } => {
  const {
    servingRuntimes: { loaded, error },
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

  return { loaded, error: undefined };
};

export default useProjectErrorForPrefilledModel;
