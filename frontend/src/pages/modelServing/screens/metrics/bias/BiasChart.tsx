import React from 'react';
import MetricsChart from '#~/pages/modelServing/screens/metrics/MetricsChart';
import { ModelServingMetricsContext } from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { BiasMetricConfig } from '#~/concepts/trustyai/types';
import { createChartThresholds } from '#~/pages/modelServing/screens/metrics/utils';
import { BIAS_CHART_CONFIGS } from '#~/pages/modelServing/screens/metrics/const';
import { PrometheusQueryRangeResponseDataResult, PrometheusQueryRangeResultValue } from '#~/types';

export type BiasChartProps = {
  biasMetricConfig: BiasMetricConfig;
};

const BiasChart: React.FC<BiasChartProps> = ({ biasMetricConfig }) => {
  const { data } = React.useContext(ModelServingMetricsContext);

  const { id, metricType, thresholdDelta } = biasMetricConfig;

  const { title, abbreviation, modelMetricKey, chartType, domainCalculator } =
    BIAS_CHART_CONFIGS[metricType];

  const metric = React.useMemo(() => {
    const convertData = (
      metricData: PrometheusQueryRangeResultValue[] | PrometheusQueryRangeResponseDataResult[],
    ): PrometheusQueryRangeResultValue[] => {
      const filteredMetricData = metricData.filter(
        (x): x is PrometheusQueryRangeResponseDataResult => 'metric' in x,
      );
      const values = filteredMetricData.find((x) => x.metric.request === id)?.values || [];
      return values;
    };

    return {
      ...data[modelMetricKey],
      data: convertData(data[modelMetricKey].data),
      refresh: async () => {
        const refreshedData = await data[modelMetricKey].refresh();
        return refreshedData ? convertData(refreshedData) : [];
      },
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
