import { MetricTypes } from '~/api';

export const EMPTY_BIAS_CONFIGURATION_TITLE = 'Bias metrics not configured';
export const EMPTY_BIAS_CONFIGURATION_DESC =
  'Bias metrics for this model have not been configured. To monitor model bias, you must first configure metrics.';

export const METRIC_TYPE_DISPLAY_NAME = {
  [MetricTypes.DIR]: 'Disparate impact ratio (DIR)',
  [MetricTypes.SPD]: 'Statistical parity difference (SPD)',
};
