import { useAppContext } from '~/app/AppContext';
import { featureFlagEnabled } from '~/utilities/utils';

const useModelServingEnabled = (): boolean => {
  const {
    dashboardConfig: {
      spec: {
        dashboardConfig: { disableModelServing },
      },
    },
  } = useAppContext();

  return featureFlagEnabled(disableModelServing);
};

export default useModelServingEnabled;
