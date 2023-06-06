import React from 'react';
import { Stack } from '@patternfly/react-core';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import {
  InferenceMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { DomainCalculator, MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';

export type TrustyChartProps = {
  title: string;
  abbreviation: string;
  metricType: InferenceMetricType.TRUSTY_AI_SPD | InferenceMetricType.TRUSTY_AI_DIR;
  tooltip?: React.ReactElement<typeof Stack>;
  thresholds: [number, number];
  domain: DomainCalculator;
  id: string;
};

const TrustyChart: React.FC<TrustyChartProps> = ({
  title,
  abbreviation,
  metricType,
  thresholds,
  domain,
  id,
}) => {
  const THRESHOLD_COLOR = 'red';
  const { data } = React.useContext(ModelServingMetricsContext);

  const metric = React.useMemo(() => {
    const metricData = data[metricType].data;

    const values = metricData.find((x) => x.metric.request === id)?.values;

    // const values = [];
    return {
      ...data[metricType],
      data: values,
    };
  }, [data, id, metricType]);

  const type = React.useMemo(() => {
    if (metricType === InferenceMetricType.TRUSTY_AI_SPD) {
      return MetricsChartTypes.AREA;
    }
    return MetricsChartTypes.LINE;
  }, [metricType]);

  return (
    <MetricsChart
      title={`${title} (${abbreviation})`}
      metrics={{
        name: abbreviation,
        metric: metric,
      }}
      domain={domain}
      thresholds={thresholds.map((t) => ({
        value: t,
        color: THRESHOLD_COLOR,
      }))}
      type={type}
    />
  );
};
export default TrustyChart;
