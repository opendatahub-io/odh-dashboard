import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import MetricsPlaceHolder from '~/pages/modelServing/screens/metrics/performance/MetricsPlaceHolder';

const KserveMetrics: React.FC = () => (
  <Stack hasGutter>
    <StackItem>
      <MetricsPlaceHolder title="HTTP requests per 5 minutes" />
    </StackItem>
    <StackItem>
      <MetricsPlaceHolder title="Average response time (ms)" />
    </StackItem>
    <StackItem>
      <MetricsPlaceHolder title="CPU utilization %" />
    </StackItem>
    <StackItem>
      <MetricsPlaceHolder title="Memory utilization %" />
    </StackItem>
  </Stack>
);

export default KserveMetrics;
