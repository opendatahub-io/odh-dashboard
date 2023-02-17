import { useAppContext } from 'app/AppContext';
import { useDashboardNamespace } from 'redux/selectors';
import { isModelMetricsEnabled } from './screens/metrics/utils';

const useModelMetricsEnabled = (): { modelMetricsEnabled: () => boolean } => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { dashboardConfig } = useAppContext();

  const modelMetricsEnabled = () => isModelMetricsEnabled(dashboardNamespace, dashboardConfig);

  return { modelMetricsEnabled };
};

export default useModelMetricsEnabled;
