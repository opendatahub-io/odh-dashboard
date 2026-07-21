import React from 'react';
import MetricsChart from '../MetricsChart';
import { ModelServingMetricsContext } from '../ModelServingMetricsContext';
import { BiasMetricConfig } from '@odh-dashboard/internal/concepts/trustyai/types';
import { createChartThresholds } from '../utils';
import { BIAS_CHART_CONFIGS } from '../const';
import { PrometheusQueryRangeResponseDataResult, PrometheusQueryRangeResultValue } from '@odh-dashboard/internal/types';

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
