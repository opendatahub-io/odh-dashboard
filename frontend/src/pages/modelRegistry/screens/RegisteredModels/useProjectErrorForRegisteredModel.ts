import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { ServingRuntimePlatform } from '~/types';

const useProjectErrorForRegisteredModel = (
  projectName?: string,
  platform?: ServingRuntimePlatform,
): { loaded: boolean; error: Error | undefined } => {
  const [servingRuntimes, loaded, loadError] = useServingRuntimes(projectName);

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

  if (loadError) {
    return { loaded: true, error: loadError };
  }

  // If the platform is MULTI but it doesn't have a server
  if (platform === ServingRuntimePlatform.MULTI) {
    if (loaded && servingRuntimes.length === 0) {
      return {
        loaded,
        error: new Error('To deploy a model, you must first configure a model server.'),
      };
    }
  }

  return { loaded, error: undefined };
};

export default useProjectErrorForRegisteredModel;
