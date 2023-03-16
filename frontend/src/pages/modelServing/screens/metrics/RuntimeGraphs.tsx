import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import {
  ModelServingMetricsContext,
  RuntimeMetricType,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { TimeframeTitle } from '~/pages/modelServing/screens/types';

const RuntimeGraphs: React.FC = () => {
  const { data, currentTimeframe } = React.useContext(ModelServingMetricsContext);

  const inHours =
    currentTimeframe === TimeframeTitle.ONE_HOUR || currentTimeframe === TimeframeTitle.ONE_DAY;

  return (
    <Stack hasGutter>
      <StackItem>
        <MetricsChart
          metrics={data[RuntimeMetricType.REQUEST_COUNT]}
          color="blue"
          // TODO: Make sure this is handled per day and is dividing by 100
          title={`Http requests per ${inHours ? 'hour' : 'day'} (x100)`}
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={data[RuntimeMetricType.AVG_RESPONSE_TIME]}
          color="green"
          title="Average response time (ms)"
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={data[RuntimeMetricType.CPU_UTILIZATION]}
          color="purple"
          title="CPU utilization %"
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={data[RuntimeMetricType.MEMORY_UTILIZATION]}
          color="purple"
          title="Memory utilization %"
        />
      </StackItem>
    </Stack>
  );
};

export default RuntimeGraphs;
