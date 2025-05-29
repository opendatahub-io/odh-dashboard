import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

const useModelMetricsEnabled = (): [modelMetricsEnabled: boolean] => {
  const performanceMetricsAreaAvailable = useIsAreaAvailable(
    SupportedArea.PERFORMANCE_METRICS,
  ).status;
  const biasMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;

  const nimMetricsAreaAvailable = useIsAreaAvailable(SupportedArea.NIM_MODEL).status;

  const checkModelMetricsEnabled = () =>
    performanceMetricsAreaAvailable || biasMetricsAreaAvailable || nimMetricsAreaAvailable;

  return [checkModelMetricsEnabled()];
};

export default useModelMetricsEnabled;
