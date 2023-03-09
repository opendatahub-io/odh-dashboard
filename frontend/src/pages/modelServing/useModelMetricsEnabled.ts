// import { useAppContext } from '~/app/AppContext';
// import { useDashboardNamespace } from '~/redux/selectors';
// import { isModelMetricsEnabled } from './screens/metrics/utils';
//
// const useModelMetricsEnabled = (): [modelMetricsEnabled: boolean] => {
//   const { dashboardNamespace } = useDashboardNamespace();
//   const { dashboardConfig } = useAppContext();
//
//   const checkModelMetricsEnabled = () => isModelMetricsEnabled(dashboardNamespace, dashboardConfig);
//
//   return [checkModelMetricsEnabled()];
// };

const useModelMetricsEnabled = () => [false];

export default useModelMetricsEnabled;
