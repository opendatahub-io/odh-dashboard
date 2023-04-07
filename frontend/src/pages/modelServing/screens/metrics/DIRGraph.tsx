import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import {
  InferenceMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';

const DirGraph = () => {
  const { data } = React.useContext(ModelServingMetricsContext);
  const metric = {
    ...data[InferenceMetricType.TRUSTY_AI_SPD],
    data: data[InferenceMetricType.TRUSTY_AI_SPD].data[0]?.values, //map((x) => x?.[0]?.values || []),
  };
  // eslint-disable-next-line no-console
  console.log(`Dir graph metric: ${metric}`);
  return (
    <MetricsChart
      metrics={{
        name: 'DIR',
        metric,
      }}
      title={`Disparate Impact Ratio (DIR)`}
      domainCalc={(maxYValue) => ({
        y:
          Math.abs(maxYValue - 1) > 0.2
            ? [1 - Math.abs(maxYValue - 1) - 0.1, 1 + Math.abs(maxYValue - 1) + 0.1]
            : [0.7, 1.3],
      })}
    />
  );
};

export default DirGraph;
