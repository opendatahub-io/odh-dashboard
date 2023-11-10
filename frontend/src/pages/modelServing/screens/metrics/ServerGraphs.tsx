import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import {
  ModelServingMetricsContext,
  ServerMetricType,
} from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import {
  convertPrometheusNaNToZero,
  toPercentage,
} from '~/pages/modelServing/screens/metrics/utils';
import {
  ContextResourceData,
  PrometheusQueryRangeResponseDataResult,
  PrometheusQueryRangeResultValue,
} from '~/types';
import { NamedMetricChartLine } from './types';

const ServerGraphs: React.FC = () => {
  const { data } = React.useContext(ModelServingMetricsContext);

  return (
    <Stack hasGutter>
      <StackItem>
        <MetricsChart
          metrics={{
            metric: data[
              ServerMetricType.REQUEST_COUNT
            ] as ContextResourceData<PrometheusQueryRangeResultValue>,
          }}
          color="blue"
          title="HTTP requests"
          isStack
        />
      </StackItem>
      <StackItem>
        <MetricsChart
          metrics={(
            data[
              ServerMetricType.AVG_RESPONSE_TIME
            ] as ContextResourceData<PrometheusQueryRangeResponseDataResult>
          ).data.map(
            (line): NamedMetricChartLine => ({
              name: line.metric.pod || '',
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
          metrics={{
            metric: data[
              ServerMetricType.CPU_UTILIZATION
            ] as ContextResourceData<PrometheusQueryRangeResultValue>,
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
            metric: data[
              ServerMetricType.MEMORY_UTILIZATION
            ] as ContextResourceData<PrometheusQueryRangeResultValue>,
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
