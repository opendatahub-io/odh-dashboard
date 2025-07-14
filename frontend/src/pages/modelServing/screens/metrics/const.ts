import { BiasMetricType } from '#~/api';
import { BiasChartConfigMap, MetricsChartTypes } from '#~/pages/modelServing/screens/metrics/types';
import { ModelMetricType } from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { calculateThresholds } from '#~/pages/modelServing/screens/metrics/utils';

export const EMPTY_BIAS_CONFIGURATION_TITLE = 'Bias metrics not configured';
export const EMPTY_BIAS_CONFIGURATION_DESC =
  'Bias metrics for this model have not been configured. To monitor model bias, you must first configure metrics.';

export const METRIC_TYPE_DISPLAY_NAME: { [key in BiasMetricType]: string } = {
  [BiasMetricType.DIR]: 'Disparate impact ratio (DIR)',
  [BiasMetricType.SPD]: 'Statistical parity difference (SPD)',
};

export const METRIC_TYPE_DESCRIPTION: { [key in BiasMetricType]: string } = {
  [BiasMetricType.DIR]:
    'Calculates the ratio between the proportion of the privileged and unprivileged groups getting a particular outcome.',
  [BiasMetricType.SPD]:
    'Calculates the difference between the proportion of the privileged and unprivileged groups getting a particular outcome.',
};

export const EMPTY_BIAS_CHART_SELECTION_TITLE = 'No bias metrics selected';
export const EMPTY_BIAS_CHART_SELECTION_DESC =
  'To display bias metric charts, select one or more bias metrics.';

export const BIAS_THRESHOLD_COLOR = 'var(--pf-chart-global--danger--Color--100, #c9190b)';
export const BIAS_DOMAIN_PADDING = 0.1;

export const BIAS_CHART_CONFIGS: BiasChartConfigMap = {
  [BiasMetricType.SPD]: {
    title: 'Statistical parity difference',
    abbreviation: 'SPD',
    modelMetricKey: ModelMetricType.TRUSTY_AI_SPD,
    chartType: MetricsChartTypes.AREA,
    thresholdOrigin: 0,
    defaultDelta: 0.1,
    domainCalculator: (delta) => (maxYValue, minYValue) => {
      const { thresholdOrigin, defaultDelta } = BIAS_CHART_CONFIGS[BiasMetricType.SPD];

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
  [BiasMetricType.DIR]: {
    title: 'Disparate impact ratio',
    abbreviation: 'DIR',
    modelMetricKey: ModelMetricType.TRUSTY_AI_DIR,
    chartType: MetricsChartTypes.LINE,
    thresholdOrigin: 1,
    defaultDelta: 0.2,
    domainCalculator: (delta) => (maxYValue) => {
      const { thresholdOrigin, defaultDelta } = BIAS_CHART_CONFIGS[BiasMetricType.DIR];
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
