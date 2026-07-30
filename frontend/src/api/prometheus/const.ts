import { DEFAULT_LIST_FETCH_STATE } from '@odh-dashboard/ui-core/utilities/metrics';

export const PROMETHEUS_BIAS_PATH = '/api/prometheus/bias';

export const DEFAULT_PENDING_CONTEXT_RESOURCE = {
  ...DEFAULT_LIST_FETCH_STATE,
  pending: false,
};
