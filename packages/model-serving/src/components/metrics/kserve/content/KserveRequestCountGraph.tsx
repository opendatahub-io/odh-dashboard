import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { KserveMetricGraphDefinition } from '../types';
import { useFetchKserveRequestCountData } from '../../../../api/prometheus/kservePerformanceMetrics';
import MetricsChart from '../../MetricsChart';

type KserveRequestCountGraphProps = {
  graphDefinition: KserveMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const KserveRequestCountGraph: React.FC<KserveRequestCountGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { successCount, failedCount },
  } = useFetchKserveRequestCountData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      metrics={[
        {
          name: 'Successful',
          metric: successCount,
        },
        {
          name: 'Failed',
          metric: failedCount,
        },
      ]}
      color="blue"
      title={graphDefinition.title}
      isStack
    />
  );
};

export default KserveRequestCountGraph;
