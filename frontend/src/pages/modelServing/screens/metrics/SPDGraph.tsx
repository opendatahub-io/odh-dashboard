import React from 'react';
import {
  InferenceMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';

const SPDGraph = () => {
  const { data } = React.useContext(ModelServingMetricsContext);
  const metric = {
    ...data[InferenceMetricType.TRUSTY_AI_SPD],
    data: data[InferenceMetricType.TRUSTY_AI_SPD].data[0]?.values, //map((x) => x?.[0]?.values || []),
  };
  return (
    <MetricsChart
      metrics={{
        name: 'SPD',
        metric: metric,
      }}
      title={`Statistical Parity Difference (SPD)`}
      domainCalc={(maxYValue) => ({
        y: maxYValue > 0.1 ? [-1 * maxYValue - 0.1, maxYValue + 0.1] : [-0.2, 0.2],
      })}
    />
  );
};
export default SPDGraph;
