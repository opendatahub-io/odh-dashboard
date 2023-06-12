import React from 'react';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import { ModelServingMetricsContext } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { createChartThresholds } from '~/pages/modelServing/screens/metrics/utils';
import { BIAS_CHART_CONFIGS } from '~/pages/modelServing/screens/metrics/const';

export type TrustyChartProps = {
  biasMetricConfig: BiasMetricConfig;
};

const TrustyChart: React.FC<TrustyChartProps> = ({ biasMetricConfig }) => {
  const { data } = React.useContext(ModelServingMetricsContext);

  const { id, metricType, thresholdDelta } = biasMetricConfig;

  const { title, abbreviation, inferenceMetricKey, chartType, domainCalculator } =
    BIAS_CHART_CONFIGS[metricType];

  const metric = React.useMemo(() => {
    const metricData = data[inferenceMetricKey].data;

    const values = metricData.find((x) => x.metric.request === id)?.values;

    return {
      ...data[inferenceMetricKey],
      data: values,
    };
  }, [data, id, inferenceMetricKey]);

  return (
    <MetricsChart
      title={`${title} (${abbreviation})`}
      metrics={{
        name: abbreviation,
        metric: metric,
      }}
      domain={domainCalculator(thresholdDelta)}
      thresholds={createChartThresholds(biasMetricConfig)}
      type={chartType}
    />
  );
};

export default TrustyChart;
