import React from 'react';
import { KserveMetricGraphDefinition } from '~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '~/concepts/metrics/types';
import { useFetchKserveTimeToFirstTokenData } from '~/api/prometheus/kservePerformanceMetrics';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import { MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';
import { convertPrometheusNaNToZero } from '~/pages/modelServing/screens/metrics/utils';

// Graph #4 - Time to First Token
type KserveTimeToFirstTokenGraphProps = {
  graphDefinition: KserveMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const KserveTimeToFirstTokenGraph: React.FC<KserveTimeToFirstTokenGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { timeToFirstToken },
  } = useFetchKserveTimeToFirstTokenData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={{ metric: {...timeToFirstToken, data: convertPrometheusNaNToZero(timeToFirstToken.data) }}}
      color="blue"
    />
  );
};

export default KserveTimeToFirstTokenGraph;
