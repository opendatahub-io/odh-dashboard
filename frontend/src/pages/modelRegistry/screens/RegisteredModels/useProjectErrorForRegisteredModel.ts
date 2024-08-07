import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { ServingRuntimePlatform } from '~/types';

const useProjectErrorForRegisteredModel = (
  projectName?: string,
  platform?: ServingRuntimePlatform,
): Error | undefined => {
  const [servingRuntimes, loaded, loadError] = useServingRuntimes(projectName);

  // If project is not selected, there is no error
  if (!projectName) {
    return undefined;
  }

  // If the platform is not selected
  if (!platform) {
    return new Error('Cannot deploy the model until you select a model serving platform');
  }

  if (loadError) {
    return loadError;
  }

  // If the platform is MULTI but it doesn't have a server
  if (platform === ServingRuntimePlatform.MULTI) {
    if (loaded && servingRuntimes.length === 0) {
      return new Error('Cannot deploy the model until you configure a model server');
    }
  }

  return undefined;
};

export default useProjectErrorForRegisteredModel;
