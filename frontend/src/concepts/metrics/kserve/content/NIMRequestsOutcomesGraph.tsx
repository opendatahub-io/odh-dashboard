import React from 'react';
import { NimMetricGraphDefinition } from '~/concepts/metrics/kserve/types';
import { useFetchNimRequestsOutcomesData } from '~/api/prometheus/NimPerformanceMetrics';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import { TimeframeTitle } from '~/concepts/metrics/types';
import { MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';

type NimRequestsOutcomesGraphProps = {
  graphDefinition: NimMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const NimRequestsOutcomesGraph: React.FC<NimRequestsOutcomesGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { successCount, failedCount },
  } = useFetchNimRequestsOutcomesData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      metrics={[
        {
          name: `Successful`,
          metric: successCount,
        },
        {
          name: `Failed`,
          metric: failedCount,
        },
      ]}
      color="blue"
      title={graphDefinition.title}
      isStack
      type={MetricsChartTypes.DONUT}
    />
  );
};

export default NimRequestsOutcomesGraph;
