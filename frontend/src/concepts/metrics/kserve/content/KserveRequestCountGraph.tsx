import React from 'react';
import { KserveMetricGraphDefinition } from '#~/concepts/metrics/kserve/types';
import { useFetchKserveRequestCountData } from '#~/api';
import MetricsChart from '#~/pages/modelServing/screens/metrics/MetricsChart';
import { TimeframeTitle } from '#~/concepts/metrics/types';

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
