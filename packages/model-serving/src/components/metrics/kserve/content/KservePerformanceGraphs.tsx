import { Stack, StackItem } from '@patternfly/react-core/dist/esm';
import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import KserveRequestCountGraph from './KserveRequestCountGraph';
import KserveMeanLatencyGraph from './KserveMeanLatencyGraph';
import KserveCpuUsageGraph from './KserveCpuUsageGraph';
import KserveMemoryUsageGraph from './KserveMemoryUsageGraph';
import NIMTimeToFirstTokenGraph from './NIMTimeForFirstTokenGraphs';
import NIMTimePerOutputTokenGraph from './NIMTimePerOutputTokenGraph';
import NIMKVCacheUsageGraph from './NIMKVCacheUsageGraph';
import NIMCurrentRequestsGraph from './NIMCurrentRequestsGraph';
import NIMTokensCountGraph from './NIMTokensCountGraph';
import NIMRequestsOutcomesGraph from './NIMRequestsOutcomesGraph';
import { KserveMetricsGraphTypes, NimMetricsGraphTypes } from '../const';
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

    if (graphDefinition.type === KserveMetricsGraphTypes.TIME_TO_FIRST_TOKEN) {
      return (
        <NIMTimeToFirstTokenGraph
          graphDefinition={{ ...graphDefinition, type: NimMetricsGraphTypes.TIME_TO_FIRST_TOKEN }}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    if (graphDefinition.type === KserveMetricsGraphTypes.TIME_PER_OUTPUT_TOKEN) {
      return (
        <NIMTimePerOutputTokenGraph
          graphDefinition={{ ...graphDefinition, type: NimMetricsGraphTypes.TIME_PER_OUTPUT_TOKEN }}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    if (graphDefinition.type === KserveMetricsGraphTypes.KV_CACHE) {
      return (
        <NIMKVCacheUsageGraph
          graphDefinition={{ ...graphDefinition, type: NimMetricsGraphTypes.KV_CACHE }}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    if (graphDefinition.type === KserveMetricsGraphTypes.CURRENT_REQUESTS) {
      return (
        <NIMCurrentRequestsGraph
          graphDefinition={{ ...graphDefinition, type: NimMetricsGraphTypes.CURRENT_REQUESTS }}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    if (graphDefinition.type === KserveMetricsGraphTypes.TOKENS_COUNT) {
      return (
        <NIMTokensCountGraph
          graphDefinition={{ ...graphDefinition, type: NimMetricsGraphTypes.TOKENS_COUNT }}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // Condition IS necessary as graph types are provided by the backend.
    // We need to guard against receiving an unknown value at runtime and fail gracefully.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (graphDefinition.type === KserveMetricsGraphTypes.REQUEST_OUTCOMES) {
      return (
        <NIMRequestsOutcomesGraph
          graphDefinition={{ ...graphDefinition, type: NimMetricsGraphTypes.REQUEST_OUTCOMES }}
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
