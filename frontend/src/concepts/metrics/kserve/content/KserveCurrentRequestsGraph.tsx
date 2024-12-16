import React from 'react';
import { KserveMetricGraphDefinition } from '~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '~/concepts/metrics/types';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import { useFetchKserveCurrentRequestsData } from '~/api';
import { convertPrometheusNaNToZero } from '~/pages/modelServing/screens/metrics/utils';
import { MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';
type KserveCurrentRequestsGraphProps = {
  graphDefinition: KserveMetricGraphDefinition; // Contains queries and title
  timeframe: TimeframeTitle;                   // Time range
  end: number;                                 // End timestamp
  namespace: string;                           // Namespace
};
const KserveCurrentRequestsGraph: React.FC<KserveCurrentRequestsGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  // Fetch the data for "Running", "Waiting", and "Max Requests"
  const {
    data: { requestsWaiting, requestsRunning, maxRequests },
  } = useFetchKserveCurrentRequestsData(graphDefinition, timeframe, end, namespace);
  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={[
        {
          name: graphDefinition.queries[0].title, // "Requests waiting"
          metric: {
            ...requestsWaiting,
            data: convertPrometheusNaNToZero(requestsWaiting.data),
          },
          color: "blue", // Custom color for "Requests waiting"
        },
        {
          name: graphDefinition.queries[1].title, // "Requests running"
          metric: {
            ...requestsRunning,
            data: convertPrometheusNaNToZero(requestsRunning.data),
          },
          color: "green", // Custom color for "Requests running"
        },
        {
          name: graphDefinition.queries[2].title, // "Max requests"
          metric: {
            ...maxRequests,
            data: convertPrometheusNaNToZero(maxRequests.data),
          },
          color: "red", // Custom color for "Max requests"
        },
      ]}
      type={MetricsChartTypes.LINE} // Render as line graph
    />
  );
};
export default KserveCurrentRequestsGraph;