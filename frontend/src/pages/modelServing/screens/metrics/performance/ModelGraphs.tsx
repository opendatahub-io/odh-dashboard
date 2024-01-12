import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import {
  ModelMetricType,
  ModelServingMetricsContext,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { ContextResourceData, PrometheusQueryRangeResultValue } from '~/types';

const ModelGraphs: React.FC = () => {
  const { data } = React.useContext(ModelServingMetricsContext);

  return (
    <Stack hasGutter>
      <StackItem>
        <MetricsChart
          metrics={[
            {
              name: 'Successful',
              metric: data[
                ModelMetricType.REQUEST_COUNT_SUCCESS
              ] as ContextResourceData<PrometheusQueryRangeResultValue>,
            },
            {
              name: 'Failed',
              metric: data[
                ModelMetricType.REQUEST_COUNT_FAILED
              ] as ContextResourceData<PrometheusQueryRangeResultValue>,
            },
          ]}
          color="blue"
          title="HTTP requests"
          isStack
        />
      </StackItem>
    </Stack>
  );
};

export default ModelGraphs;
