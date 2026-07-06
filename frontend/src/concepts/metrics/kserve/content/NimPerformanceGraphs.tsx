import { Stack, StackItem } from '@patternfly/react-core/dist/esm';
import React from 'react';
import { NimMetricGraphDefinition } from '#~/concepts/metrics/kserve/types';
import { NimMetricsGraphTypes } from '#~/concepts/metrics/kserve/const';
import { TimeframeTitle } from '#~/concepts/metrics/types';
import NIMTimeToFirstTokenGraph from './NIMTimeForFirstTokenGraphs';
import NIMKVCacheUsageGraph from './NIMKVCacheUsageGraph';
import NIMTokensCountGraph from './NIMTokensCountGraph';
import NIMRequestsOutcomesGraph from './NIMRequestsOutcomesGraph';
import NIMTimePerOutputTokenGraph from './NIMTimePerOutputTokenGraph';
import NIMCurrentRequestsGraph from './NIMCurrentRequestsGraph';

type NimPerformanceGraphsProps = {
  namespace: string;
  graphDefinitions: NimMetricGraphDefinition[];
  timeframe: TimeframeTitle;
  end: number;
};

const NimPerformanceGraphs: React.FC<NimPerformanceGraphsProps> = ({
  namespace,
  graphDefinitions,
  timeframe,
  end,
}) => {
  const renderGraph = (graphDefinition: NimMetricGraphDefinition) => {
    // Graph #1 - KV Cache usage over time
    if (graphDefinition.type === NimMetricsGraphTypes.KV_CACHE) {
      return (
        <NIMKVCacheUsageGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // Graph #3 - Total Prompt Token Count and Total Generation Token Count
    if (graphDefinition.type === NimMetricsGraphTypes.TOKENS_COUNT) {
      return (
        <NIMTokensCountGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // Graph #4 - Time to First Token
    if (graphDefinition.type === NimMetricsGraphTypes.TIME_TO_FIRST_TOKEN) {
      return (
        <NIMTimeToFirstTokenGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // Graph #5 - Time per Output Token
    if (graphDefinition.type === NimMetricsGraphTypes.TIME_PER_OUTPUT_TOKEN) {
      return (
        <NIMTimePerOutputTokenGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // Graph #6- Requests Outcomes
    if (graphDefinition.type === NimMetricsGraphTypes.REQUEST_OUTCOMES) {
      return (
        <NIMRequestsOutcomesGraph
          graphDefinition={graphDefinition}
          timeframe={timeframe}
          end={end}
          namespace={namespace}
        />
      );
    }

    // Graph #2 Current Requests
    // Condition IS necessary as graph types are provided by the backend.
    // We need to guard against receiving an unknown value at runtime and fail gracefully.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (graphDefinition.type === NimMetricsGraphTypes.CURRENT_REQUESTS) {
      return (
        <NIMCurrentRequestsGraph
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

export default NimPerformanceGraphs;
