import { Stack, StackItem } from '@patternfly/react-core/dist/esm';
import React from 'react';
import { KserveMetricGraphDefinition } from '~/concepts/metrics/kserve/types';
import { KserveMetricsGraphTypes } from '~/concepts/metrics/kserve/const';
import KserveRequestCountGraph from '~/concepts/metrics/kserve/content/KserveRequestCountGraph';
import { TimeframeTitle } from '~/concepts/metrics/types';
import KserveMeanLatencyGraph from '~/concepts/metrics/kserve/content/KserveMeanLatencyGraph';
import KserveCpuUsageGraph from '~/concepts/metrics/kserve/content/KserveCpuUsageGraph';
import KserveMemoryUsageGraph from '~/concepts/metrics/kserve/content/KserveMemoryUsageGraph';
import KserveTimeToFirstTokenGraph from './KserveTimeForFirstTokenGraphs';
import KserveKVCacheUsageGraph from './KserveKVCacheUsageGraph';
import KserveTokensCountGraph from './KserveTokensCountGraph';
import KserveRequestsOutcomesGraph from './KserveRequestsOutcomesGraph';
import KserveTimePerOutputTokenGraph from './KserveTimePerOutputTokenGraph';
import KserveCurrentRequestsGraph from './KserveCurrentRequestsGraph';

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

    // Graph #1 - KV Cache usage over time
    if (graphDefinition.type === KserveMetricsGraphTypes.KV_CACHE) {
      return (
        <KserveKVCacheUsageGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

// Graph #3 - Total Prompt Token Count and Total Generation Token Count
    if (graphDefinition.type === KserveMetricsGraphTypes.TOKENS_COUNT) {
      return (
        <KserveTokensCountGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }


    // Graph #4 - Time to First Token
    if (graphDefinition.type === KserveMetricsGraphTypes.TIME_TO_FIRST_TOKEN) {
      return (
        <KserveTimeToFirstTokenGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // Graph #5 - Time per Output Token
    if (graphDefinition.type === KserveMetricsGraphTypes.TIME_PER_OUTPUT_TOKEN) {
      return (
        <KserveTimePerOutputTokenGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // Graph #6- Requests Outcomes
    if (graphDefinition.type === KserveMetricsGraphTypes.REQUEST_OUTCOMES) {
      return (
        <KserveRequestsOutcomesGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // Graph #2 Current Requests
    if (graphDefinition.type === KserveMetricsGraphTypes.CURRENT_REQUESTS) {
      return (
        <KserveCurrentRequestsGraph
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
