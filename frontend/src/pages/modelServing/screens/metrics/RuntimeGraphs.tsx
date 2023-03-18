import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import {
  ModelServingMetricsContext,
  RuntimeMetricType,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { TimeframeTitle } from '~/pages/modelServing/screens/types';
import { per100 } from '~/pages/modelServing/screens/metrics/utils';

const RuntimeGraphs: React.FC = () => {
  const { data, currentTimeframe } = React.useContext(ModelServingMetricsContext);

  const inHours =
    currentTimeframe === TimeframeTitle.ONE_HOUR || currentTimeframe === TimeframeTitle.ONE_DAY;

  return (
    <Stack hasGutter>
      <StackItem>
        <MetricsChart
          metrics={{ metric: data[RuntimeMetricType.REQUEST_COUNT], translatePoint: per100 }}
          color="blue"
          title={`Http requests per ${inHours ? 'hour' : 'day'} (x100)`}
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={{ metric: data[RuntimeMetricType.AVG_RESPONSE_TIME] }}
          color="green"
          title="Average response time (ms)"
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={{ metric: data[RuntimeMetricType.CPU_UTILIZATION] }}
          color="purple"
          title="CPU utilization %"
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={{ metric: data[RuntimeMetricType.MEMORY_UTILIZATION] }}
          color="orange"
          title="Memory utilization %"
        />
      </StackItem>
    </Stack>
  );
};

export default RuntimeGraphs;
