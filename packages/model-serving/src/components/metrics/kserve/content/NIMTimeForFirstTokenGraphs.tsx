import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { useFetchNimTimeToFirstTokenData } from '@odh-dashboard/model-serving/api/prometheus/kservePerformanceMetrics';
import { NimMetricGraphDefinition } from '../types';
import MetricsChart from '../../MetricsChart';
import { convertPrometheusNaNToZero } from '../../utils';

// Graph #4 - Time to First Token
type NimTimeToFirstTokenGraphProps = {
  graphDefinition: NimMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const NimTimeToFirstTokenGraph: React.FC<NimTimeToFirstTokenGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { timeToFirstToken },
  } = useFetchNimTimeToFirstTokenData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={{
        metric: { ...timeToFirstToken, data: convertPrometheusNaNToZero(timeToFirstToken.data) },
      }}
      color="blue"
      domain={() => ({
        y: [0, 20],
      })}
    />
  );
};

export default NimTimeToFirstTokenGraph;
