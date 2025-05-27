import { DEFAULT_LIST_FETCH_STATE } from '~/utilities/const';

export const PROMETHEUS_BIAS_PATH = '/api/prometheus/bias';

export const DEFAULT_PENDING_CONTEXT_RESOURCE = {
  ...DEFAULT_LIST_FETCH_STATE,
  pending: false,
};
