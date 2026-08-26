import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { useFetchNimKVCacheUsageData } from '@odh-dashboard/model-serving/api/prometheus/kservePerformanceMetrics';
import { NimMetricGraphDefinition } from '../types';
import MetricsChart from '../../MetricsChart';
import { MetricsChartTypes } from '../../types';
import { toPercentage } from '../../utils';

// Graph #1 - KV Cache usage over time
type NimKVCacheUsageGraphProps = {
  graphDefinition: NimMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const NimKVCacheUsageGraph: React.FC<NimKVCacheUsageGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { kvCacheUsage },
  } = useFetchNimKVCacheUsageData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={{ metric: kvCacheUsage, translatePoint: toPercentage }}
      type={MetricsChartTypes.LINE}
      domain={() => ({
        y: [0, 100],
      })}
    />
  );
};

export default NimKVCacheUsageGraph;
