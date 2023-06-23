import { useAppContext } from '~/app/AppContext';
import { featureFlagEnabled } from '~/utilities/utils';

const usePerformanceMetricsEnabled = () => {
  const {
    dashboardConfig: {
      spec: {
        dashboardConfig: { disablePerformanceMetrics },
      },
    },
  } = useAppContext();

  return [featureFlagEnabled(disablePerformanceMetrics)];
};

export default usePerformanceMetricsEnabled;
