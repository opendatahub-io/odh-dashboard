import { Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import {
  InferenceMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';

const SPDGraph = () => {
  const { data } = React.useContext(ModelServingMetricsContext);
  return (
    <Stack hasGutter>
      <StackItem>
        <MetricsChart
          metrics={{
            name: 'BiasSPD',
            metric: data[InferenceMetricType.TRUSTY_AI_SPD],
          }}
          title={`Statistical Parity Difference (SPD)`}
          domainCalc={(maxYValue) => ({
            y: maxYValue > 0.1 ? [-1 * maxYValue - 0.1, maxYValue + 0.1] : [-0.2, 0.2],
          })}
        />
      </StackItem>
    </Stack>
  );
};
export default SPDGraph;
