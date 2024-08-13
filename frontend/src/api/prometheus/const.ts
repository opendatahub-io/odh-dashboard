import { DEFAULT_CONTEXT_DATA } from '~/utilities/const';

export const PROMETHEUS_BIAS_PATH = '/api/prometheus/bias';

export const DEFAULT_PENDING_CONTEXT_RESOURCE = {
  ...DEFAULT_CONTEXT_DATA,
  pending: false,
};
