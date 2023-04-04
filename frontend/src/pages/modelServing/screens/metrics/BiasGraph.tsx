import { Card, CardBody, CardTitle, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import {
  InferenceMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { per100 } from '~/pages/modelServing/screens/metrics/utils';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';

const BiasGraph = () => {
  const { data } = React.useContext(ModelServingMetricsContext);
  return (
    <Stack hasGutter>
      <StackItem>
        <MetricsChart
          metrics={{
            name: 'Bias',
            metric: data[InferenceMetricType.TRUSTY_AI_SPD],
            translatePoint: per100,
          }}
          title={`SPD`}
        />
      </StackItem>
    </Stack>
  );
};
export default BiasGraph;
