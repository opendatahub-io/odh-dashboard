import React from 'react';
import { KserveMetricGraphDefinition } from '#~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '#~/concepts/metrics/types';

import { useFetchKserveMemoryUsageData } from '#~/api';
import MetricsChart from '#~/pages/modelServing/screens/metrics/MetricsChart';
import { toPercentage } from '#~/pages/modelServing/screens/metrics/utils';

type KserveMemoryUsageGraphProps = {
  graphDefinition: KserveMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const KserveMemoryUsageGraph: React.FC<KserveMemoryUsageGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { memoryUsage },
  } = useFetchKserveMemoryUsageData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={{
        metric: memoryUsage,
        translatePoint: toPercentage,
      }}
      color="orange"
      domain={() => ({
        y: [0, 100],
      })}
    />
  );
};

export default KserveMemoryUsageGraph;
