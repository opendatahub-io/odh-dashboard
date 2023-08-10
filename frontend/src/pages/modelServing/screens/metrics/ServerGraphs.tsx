import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import {
  ModelServingMetricsContext,
  ServerMetricType,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import {
  convertPrometheusNaNToZero,
  per100,
  toPercentage,
} from '~/pages/modelServing/screens/metrics/utils';
import { NamedMetricChartLine } from './types';

const ServerGraphs: React.FC = () => {
  const { data } = React.useContext(ModelServingMetricsContext);

  return (
    <Stack hasGutter>
      <StackItem>
        <MetricsChart
          metrics={{ metric: data[ServerMetricType.REQUEST_COUNT], translatePoint: per100 }}
          color="blue"
          title="Http requests (x100)"
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={data[ServerMetricType.AVG_RESPONSE_TIME].data.map(
            (line): NamedMetricChartLine => ({
              name: line.metric.pod,
              metric: {
                ...data[ServerMetricType.AVG_RESPONSE_TIME],
                data: convertPrometheusNaNToZero(line.values),
              },
            }),
          )}
          color="green"
          title="Average response time (ms)"
          isStack
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={{ metric: data[ServerMetricType.CPU_UTILIZATION], translatePoint: toPercentage }}
          color="purple"
          title="CPU utilization %"
          domain={() => ({
            y: [0, 100],
          })}
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={{
            metric: data[ServerMetricType.MEMORY_UTILIZATION],
            translatePoint: toPercentage,
          }}
          color="orange"
          title="Memory utilization %"
          domain={() => ({
            y: [0, 100],
          })}
        />
      </StackItem>
    </Stack>
  );
};

export default ServerGraphs;
