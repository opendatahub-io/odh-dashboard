import React from 'react';
import { KserveMetricGraphDefinition } from '~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '~/concepts/metrics/types';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import { useFetchKserveTimePerOutputTokenData } from '~/api';
import { convertPrometheusNaNToZero } from '~/pages/modelServing/screens/metrics/utils';
import { MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';


type KserveTimePerOutputTokenGraphProps = {
  graphDefinition: KserveMetricGraphDefinition; // Contains query and title
  timeframe: TimeframeTitle;                   // Time range
  end: number;                                 // End timestamp
  namespace: string;                           // Namespace
};
const KserveTimePerOutputTokenGraph: React.FC<KserveTimePerOutputTokenGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  // Fetch the data for "Time per Output Token"
  const {
    data: { timePerOutputToken },
  } = useFetchKserveTimePerOutputTokenData(graphDefinition, timeframe, end, namespace);
  // return (
  //   <MetricsChart
  //     metrics={[
  //       {
  //         name: graphDefinition.queries[0].title, // Title for the chart
  //         metric: {
  //           ...timePerOutputToken,                // Fetched data
  //           data: convertPrometheusNaNToZero(timePerOutputToken.data),
  //         },
  //       },
  //     ]}
  //     color="blue" // Use a blue color for the chart
  //     title={graphDefinition.title} // Chart title
  //     type={MetricsChartTypes.AREA}
  //   />
  // );

  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={{ metric: {...timePerOutputToken, data: convertPrometheusNaNToZero(timePerOutputToken.data) }}}
      color="blue"
      type={MetricsChartTypes.AREA}
    />
  );

};
export default KserveTimePerOutputTokenGraph;