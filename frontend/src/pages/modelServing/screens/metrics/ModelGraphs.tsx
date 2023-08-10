import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import {
  ModelMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { per100 } from './utils';

const ModelGraphs: React.FC = () => {
  const { data } = React.useContext(ModelServingMetricsContext);

  return (
    <Stack hasGutter>
      <StackItem>
        <MetricsChart
          metrics={[
            {
              name: 'Success http requests (x100)',
              metric: data[ModelMetricType.REQUEST_COUNT_SUCCESS],
              translatePoint: per100,
            },
            {
              name: 'Failed http requests (x100)',
              metric: data[ModelMetricType.REQUEST_COUNT_FAILED],
              translatePoint: per100,
            },
          ]}
          title="Http requests (x100)"
        />
      </StackItem>
    </Stack>
  );
};

export default ModelGraphs;
