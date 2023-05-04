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

  return (
    featureFlagEnabled(disableModelServing) && featureFlagEnabled(disableCustomServingRuntimes)
  );
};

export default useCustomServingRuntimesEnabled;
