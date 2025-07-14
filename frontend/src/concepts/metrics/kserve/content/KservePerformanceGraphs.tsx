import { Stack, StackItem } from '@patternfly/react-core/dist/esm';
import React from 'react';
import { KserveMetricGraphDefinition } from '#~/concepts/metrics/kserve/types';
import { KserveMetricsGraphTypes } from '#~/concepts/metrics/kserve/const';
import KserveRequestCountGraph from '#~/concepts/metrics/kserve/content/KserveRequestCountGraph';
import { TimeframeTitle } from '#~/concepts/metrics/types';
import KserveMeanLatencyGraph from '#~/concepts/metrics/kserve/content/KserveMeanLatencyGraph';
import KserveCpuUsageGraph from '#~/concepts/metrics/kserve/content/KserveCpuUsageGraph';
import KserveMemoryUsageGraph from '#~/concepts/metrics/kserve/content/KserveMemoryUsageGraph';

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
