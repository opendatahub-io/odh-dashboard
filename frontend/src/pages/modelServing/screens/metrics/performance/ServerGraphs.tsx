import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import MetricsChart from '#~/pages/modelServing/screens/metrics/MetricsChart';
import {
  ModelServingMetricsContext,
  ServerMetricType,
} from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import {
  convertPrometheusNaNToZero,
  toPercentage,
} from '#~/pages/modelServing/screens/metrics/utils';
import { NamedMetricChartLine } from '#~/pages/modelServing/screens/metrics/types';

const ServerGraphs: React.FC = () => {
  const { data } = React.useContext(ModelServingMetricsContext);

  return (
    <Stack hasGutter>
      <StackItem>
        <MetricsChart
          metrics={{
            metric: data[ServerMetricType.REQUEST_COUNT],
          }}
          color="blue"
          title="HTTP requests per 5 minutes"
          isStack
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={data[ServerMetricType.AVG_RESPONSE_TIME].data.map(
            (line, index): NamedMetricChartLine => ({
              name: line.metric.pod || '',
              metric: {
                ...data[ServerMetricType.AVG_RESPONSE_TIME],
                data: convertPrometheusNaNToZero(line.values),
                refresh: async () => {
                  const refreshedData = await data[ServerMetricType.AVG_RESPONSE_TIME].refresh();
                  if (!refreshedData?.[index]?.values) {
                    return [];
                  }
                  return convertPrometheusNaNToZero(refreshedData[index].values);
                },
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
          metrics={{
            metric: data[ServerMetricType.CPU_UTILIZATION],
            translatePoint: toPercentage,
          }}
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
