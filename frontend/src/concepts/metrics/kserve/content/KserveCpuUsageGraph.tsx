import React from 'react';
import { KserveMetricGraphDefinition } from '#~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '#~/concepts/metrics/types';
import { useFetchKserveCpuUsageData } from '#~/api';
import MetricsChart from '#~/pages/modelServing/screens/metrics/MetricsChart';
import { toPercentage } from '#~/pages/modelServing/screens/metrics/utils';

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
