import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

const useBiasMetricsEnabled = () => useIsAreaAvailable(SupportedArea.BIAS_METRICS).status;

export default useBiasMetricsEnabled;
