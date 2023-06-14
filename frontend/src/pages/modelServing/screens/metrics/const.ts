import { MetricTypes } from '~/api';
import { BiasChartConfigMap, MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';
import { InferenceMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { calculateThresholds } from '~/pages/modelServing/screens/metrics/utils';

export const EMPTY_BIAS_CONFIGURATION_TITLE = 'Bias metrics not configured';
export const EMPTY_BIAS_CONFIGURATION_DESC =
  'Bias metrics for this model have not been configured. To monitor model bias, you must first configure metrics.';

export const METRIC_TYPE_DISPLAY_NAME: { [key in MetricTypes]: string } = {
  [MetricTypes.DIR]: 'Disparate impact ratio (DIR)',
  [MetricTypes.SPD]: 'Statistical parity difference (SPD)',
};

export const METRIC_TYPE_DESCRIPTION: { [key in MetricTypes]: string } = {
  [MetricTypes.DIR]:
    'Disparate Impact Ratio (DIR) measures imbalances in classifications by calculating the ratio between the proportion of the privileged and unprivileged groups getting a particular outcome',
  [MetricTypes.SPD]:
    'Statistical Parity Difference (SPD) measures imbalances in classifications by calculating the difference between the proportion of the privileged and unprivileged groups getting a particular outcome',
};

export const EMPTY_BIAS_CHART_SELECTION_TITLE = 'No Bias metrics selected';
export const EMPTY_BIAS_CHART_SELECTION_DESC =
  'No bias metrics have been selected. To display charts you must first select them using the metric selector.';

export const BIAS_THRESHOLD_COLOR = 'red';
export const BIAS_DOMAIN_PADDING = 0.1;
export const DEFAULT_BIAS_THRESHOLD_DELTAS: { [key in MetricTypes]: number } = {
  [MetricTypes.SPD]: 0.1,
  [MetricTypes.DIR]: 0.2,
};

export const BIAS_CHART_CONFIGS: BiasChartConfigMap = {
  [MetricTypes.SPD]: {
    title: 'Statistical Parity Difference',
    abbreviation: 'SPD',
    inferenceMetricKey: InferenceMetricType.TRUSTY_AI_SPD,
    chartType: MetricsChartTypes.AREA,
    thresholdOrigin: 0,
    defaultDelta: 0.1,
    domainCalculator: (delta) => (maxYValue, minYValue) => {
      const { thresholdOrigin, defaultDelta } = BIAS_CHART_CONFIGS[MetricTypes.SPD];

      const [maxThreshold, minThreshold] = calculateThresholds(
        thresholdOrigin,
        delta ?? defaultDelta,
      );

      const max = Math.max(Math.abs(maxYValue), Math.abs(minYValue));

      return {
        y:
          max > maxThreshold
            ? [-1 * max - BIAS_DOMAIN_PADDING, max + BIAS_DOMAIN_PADDING]
            : [minThreshold - BIAS_DOMAIN_PADDING, maxThreshold + BIAS_DOMAIN_PADDING],
      };
    },
  },
  [MetricTypes.DIR]: {
    title: 'Disparate Impact Ratio',
    abbreviation: 'DIR',
    inferenceMetricKey: InferenceMetricType.TRUSTY_AI_DIR,
    chartType: MetricsChartTypes.LINE,
    thresholdOrigin: 1,
    defaultDelta: 0.2,
    domainCalculator: (delta) => (maxYValue) => {
      const { thresholdOrigin, defaultDelta } = BIAS_CHART_CONFIGS[MetricTypes.DIR];
      const [maxThreshold] = calculateThresholds(thresholdOrigin, delta ?? defaultDelta);

      return {
        y:
          maxYValue > maxThreshold
            ? [0, maxYValue + BIAS_DOMAIN_PADDING]
            : [0, maxThreshold + BIAS_DOMAIN_PADDING],
      };
    },
  },
};
