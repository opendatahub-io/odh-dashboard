import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { useFetchNimRequestsOutcomesData } from '@odh-dashboard/model-serving/api/prometheus/kservePerformanceMetrics';
import { NimMetricGraphDefinition } from '../types';
import MetricsChart from '../../MetricsChart';
import { MetricsChartTypes } from '../../types';

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
