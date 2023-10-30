import useBiasMetricsEnabled from '~/concepts/explainability/useBiasMetricsEnabled';
import usePerformanceMetricsEnabled from './screens/metrics/usePerformanceMetricsEnabled';

const useModelMetricsEnabled = (): [modelMetricsEnabled: boolean] => {
  const [performanceMetricsEnabled] = usePerformanceMetricsEnabled();
  const [biasMetricsEnabled] = useBiasMetricsEnabled();

  const checkModelMetricsEnabled = () => performanceMetricsEnabled || biasMetricsEnabled;

  return [checkModelMetricsEnabled()];
};

export default useModelMetricsEnabled;
