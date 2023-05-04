import { useAppContext } from '~/app/AppContext';
import { featureFlagEnabled } from '~/utilities/utils';

const useCustomServingRuntimesEnabled = (): boolean => {
  const {
    dashboardConfig: {
      spec: {
        dashboardConfig: { disableModelServing, disableCustomServingRuntimes },
      },
    },
  } = useAppContext();

  if (!featureFlagEnabled(disableModelServing)) {
    return false;
  }

  return featureFlagEnabled(disableCustomServingRuntimes);
};

export default useCustomServingRuntimesEnabled;
