import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { useFetchKserveMemoryUsageData } from '@odh-dashboard/model-serving/api/prometheus/kservePerformanceMetrics';
import { KserveMetricGraphDefinition } from '../types';

import MetricsChart from '../../MetricsChart';
import { toPercentage } from '../../utils';

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
