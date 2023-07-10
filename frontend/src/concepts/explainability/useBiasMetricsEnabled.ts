import { useAppContext } from '~/app/AppContext';
import { featureFlagEnabled } from '~/utilities/utils';

const useBiasMetricsEnabled = () => {
  const {
    dashboardConfig: {
      spec: {
        dashboardConfig: { disableBiasMetrics },
      },
    },
  } = useAppContext();

  return [featureFlagEnabled(disableBiasMetrics)];
};

export default useBiasMetricsEnabled;
