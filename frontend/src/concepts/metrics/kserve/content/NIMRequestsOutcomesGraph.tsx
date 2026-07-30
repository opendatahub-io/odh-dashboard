import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { NimMetricGraphDefinition } from '#~/concepts/metrics/kserve/types';
import { useFetchNimRequestsOutcomesData } from '#~/api';
import MetricsChart from '#~/pages/modelServing/screens/metrics/MetricsChart';
import { MetricsChartTypes } from '#~/pages/modelServing/screens/metrics/types';

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
        ...(graphDefinition.queries[0]
          ? [
              {
                name: `Successful`,
                metric: successCount,
              },
            ]
          : []),
        ...(graphDefinition.queries[1]
          ? [
              {
                name: `Failed`,
                metric: failedCount,
              },
            ]
          : []),
      ]}
      color="blue"
      title={graphDefinition.title}
      isStack
      type={MetricsChartTypes.DONUT}
    />
  );
};

export default NimRequestsOutcomesGraph;
