import { Stack, StackItem } from '@patternfly/react-core/dist/esm';
import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import KserveRequestCountGraph from './KserveRequestCountGraph';
import KserveMeanLatencyGraph from './KserveMeanLatencyGraph';
import KserveCpuUsageGraph from './KserveCpuUsageGraph';
import KserveMemoryUsageGraph from './KserveMemoryUsageGraph';
import { KserveMetricsGraphTypes } from '../const';
import { KserveMetricGraphDefinition } from '../types';

type KservePerformanceGraphsProps = {
  namespace: string;
  graphDefinitions: KserveMetricGraphDefinition[];
  timeframe: TimeframeTitle;
  end: number;
};

const KservePerformanceGraphs: React.FC<KservePerformanceGraphsProps> = ({
  namespace,
  graphDefinitions,
  timeframe,
  end,
}) => {
  const renderGraph = (graphDefinition: KserveMetricGraphDefinition) => {
    if (graphDefinition.type === KserveMetricsGraphTypes.REQUEST_COUNT) {
      return (
        <KserveRequestCountGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    if (graphDefinition.type === KserveMetricsGraphTypes.MEAN_LATENCY) {
      return (
        <KserveMeanLatencyGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    if (graphDefinition.type === KserveMetricsGraphTypes.CPU_USAGE) {
      return (
        <KserveCpuUsageGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // Condition IS necessary as graph types are provided by the backend.
    // We need to guard against receiving an unknown value at runtime and fail gracefully.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (graphDefinition.type === KserveMetricsGraphTypes.MEMORY_USAGE) {
      return (
        <KserveMemoryUsageGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // TODO: add an unsupported graph type error state.
    return null;
  };

  return (
    <Stack hasGutter>
      {graphDefinitions.map((x) => (
        <StackItem key={x.title}>{renderGraph(x)}</StackItem>
      ))}
    </Stack>
  );
};

export default KservePerformanceGraphs;
