import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';

const usePerformanceMetricsEnabled = () =>
  useIsAreaAvailable(SupportedArea.PERFORMANCE_METRICS).status;

export default usePerformanceMetricsEnabled;
