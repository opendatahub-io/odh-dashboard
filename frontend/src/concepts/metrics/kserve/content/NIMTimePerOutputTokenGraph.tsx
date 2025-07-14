import React from 'react';
import { NimMetricGraphDefinition } from '#~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '#~/concepts/metrics/types';
import MetricsChart from '#~/pages/modelServing/screens/metrics/MetricsChart';
import { useFetchNimTimePerOutputTokenData } from '#~/api';
import { convertPrometheusNaNToZero } from '#~/pages/modelServing/screens/metrics/utils';
import { MetricsChartTypes } from '#~/pages/modelServing/screens/metrics/types';

type NimTimePerOutputTokenGraphProps = {
  graphDefinition: NimMetricGraphDefinition; // Contains query and title
  timeframe: TimeframeTitle; // Time range
  end: number; // End timestamp
  namespace: string; // Namespace
};
const NimTimePerOutputTokenGraph: React.FC<NimTimePerOutputTokenGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  // Fetch the data for "Time per Output Token"
  const {
    data: { timePerOutputToken },
  } = useFetchNimTimePerOutputTokenData(graphDefinition, timeframe, end, namespace);
  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={{
        metric: {
          ...timePerOutputToken,
          data: convertPrometheusNaNToZero(timePerOutputToken.data),
        },
      }}
      color="blue"
      type={MetricsChartTypes.AREA}
    />
  );
};
export default NimTimePerOutputTokenGraph;
