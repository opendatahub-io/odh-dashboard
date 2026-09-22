import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { useFetchKserveCpuUsageData } from '@odh-dashboard/model-serving/api/prometheus/kservePerformanceMetrics';
import { KserveMetricGraphDefinition } from '../types';
import MetricsChart from '../../MetricsChart';
import { toPercentage } from '../../utils';

type KserveCpuUsageGraphProps = {
  graphDefinition: KserveMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const KserveCpuUsageGraph: React.FC<KserveCpuUsageGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { cpuUsage },
  } = useFetchKserveCpuUsageData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={{ metric: cpuUsage, translatePoint: toPercentage }}
      color="purple"
      domain={() => ({
        y: [0, 100],
      })}
    />
  );
};

export default KserveCpuUsageGraph;
