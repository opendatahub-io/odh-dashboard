import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { useFetchNimTimePerOutputTokenData } from '@odh-dashboard/model-serving/api/prometheus/kservePerformanceMetrics';
import { NimMetricGraphDefinition } from '../types';
import MetricsChart from '../../MetricsChart';
import { convertPrometheusNaNToZero } from '../../utils';
import { MetricsChartTypes } from '../../types';

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
