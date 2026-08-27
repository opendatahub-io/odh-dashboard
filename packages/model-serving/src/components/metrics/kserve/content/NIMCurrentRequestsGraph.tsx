import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { useFetchNimCurrentRequestsData } from '@odh-dashboard/model-serving/api/prometheus/kservePerformanceMetrics';
import { NimMetricGraphDefinition } from '../types';
import MetricsChart from '../../MetricsChart';
import { convertPrometheusNaNToZero } from '../../utils';
import { MetricsChartTypes } from '../../types';

type NimCurrentRequestsGraphProps = {
  graphDefinition: NimMetricGraphDefinition; // Contains queries and title
  timeframe: TimeframeTitle; // Time range
  end: number; // End timestamp
  namespace: string; // Namespace
};

const NimCurrentRequestsGraph: React.FC<NimCurrentRequestsGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  // Fetch the data for "Running", "Waiting", and "Max Requests"
  const {
    data: { requestsWaiting, requestsRunning, maxRequests },
  } = useFetchNimCurrentRequestsData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={[
        ...(graphDefinition.queries[0]
          ? [
              {
                name: graphDefinition.queries[0].title, // "Requests waiting"
                metric: {
                  ...requestsWaiting,
                  data: convertPrometheusNaNToZero(requestsWaiting.data),
                },
              },
            ]
          : []),
        ...(graphDefinition.queries[1]
          ? [
              {
                name: graphDefinition.queries[1].title, // "Requests running"
                metric: {
                  ...requestsRunning,
                  data: convertPrometheusNaNToZero(requestsRunning.data),
                },
              },
            ]
          : []),
        ...(graphDefinition.queries[2]
          ? [
              {
                name: graphDefinition.queries[2].title, // "Max requests"
                metric: {
                  ...maxRequests,
                  data: convertPrometheusNaNToZero(maxRequests.data),
                },
              },
            ]
          : []),
      ]}
      type={MetricsChartTypes.LINE} // Render as line graph
    />
  );
};

export default NimCurrentRequestsGraph;
