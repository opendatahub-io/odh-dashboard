import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import { useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas/index';

export const useIsKServeMetricsSupported = (): boolean => {
  const kserveMetricsSupported = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;
  return kserveMetricsSupported;
};
