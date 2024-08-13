import React from 'react';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import { ModelServingMetricsContext } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { BiasMetricConfig } from '~/concepts/trustyai/types';
import { createChartThresholds } from '~/pages/modelServing/screens/metrics/utils';
import { BIAS_CHART_CONFIGS } from '~/pages/modelServing/screens/metrics/const';
import { PrometheusQueryRangeResponseDataResult } from '~/types';

export type BiasChartProps = {
  biasMetricConfig: BiasMetricConfig;
};

const BiasChart: React.FC<BiasChartProps> = ({ biasMetricConfig }) => {
  const { data } = React.useContext(ModelServingMetricsContext);

  const { id, metricType, thresholdDelta } = biasMetricConfig;

  const { title, abbreviation, modelMetricKey, chartType, domainCalculator } =
    BIAS_CHART_CONFIGS[metricType];

  const metric = React.useMemo(() => {
    const metricData = data[modelMetricKey].data.filter(
      (x): x is PrometheusQueryRangeResponseDataResult => 'metric' in x,
    );

    const values = metricData.find((x) => x.metric.request === id)?.values || [];

    return {
      ...data[modelMetricKey],
      data: values,
    };
  }, [data, id, modelMetricKey]);

  return (
    <MetricsChart
      title={`${title} (${abbreviation})`}
      metrics={{
        name: abbreviation,
        metric,
      }}
      domain={domainCalculator(thresholdDelta)}
      thresholds={createChartThresholds(biasMetricConfig)}
      type={chartType}
    />
  );
};

export default BiasChart;
