import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

const useModelMetricsEnabled = (): [modelMetricsEnabled: boolean] => {
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;

  const checkModelMetricsEnabled = () =>
    performanceMetricsAreaAvailable || biasMetricsAreaAvailable;

  return [checkModelMetricsEnabled()];
};

export default useModelMetricsEnabled;
