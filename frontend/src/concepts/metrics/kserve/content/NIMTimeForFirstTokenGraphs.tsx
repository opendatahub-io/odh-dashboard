import React from 'react';
import { NimMetricGraphDefinition } from '#~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '#~/concepts/metrics/types';
import { useFetchNimTimeToFirstTokenData } from '#~/api';
import MetricsChart from '#~/pages/modelServing/screens/metrics/MetricsChart';
import { convertPrometheusNaNToZero } from '#~/pages/modelServing/screens/metrics/utils';

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
