import React from 'react';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { useFetchKserveMeanLatencyData } from '@odh-dashboard/model-serving/api/prometheus/kservePerformanceMetrics';
import { KserveMetricGraphDefinition } from '../types';
import MetricsChart from '../../MetricsChart';
import { convertPrometheusNaNToZero } from '../../utils';

type KserveMeanLatencyGraphProps = {
  graphDefinition: KserveMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const KserveMeanLatencyGraph: React.FC<KserveMeanLatencyGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { requestLatency, inferenceLatency },
  } = useFetchKserveMeanLatencyData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      metrics={[
        {
          name: graphDefinition.queries[0].title,
          metric: {
            ...inferenceLatency,
            data: convertPrometheusNaNToZero(inferenceLatency.data),
          },
        },
        ...(graphDefinition.queries[1]
          ? [
              {
                name: graphDefinition.queries[1].title,
                metric: {
                  ...requestLatency,
                  data: convertPrometheusNaNToZero(requestLatency.data),
                },
              },
            ]
          : []),
      ]}
      color="green"
      title={graphDefinition.title}
    />
  );
};

export default KserveMeanLatencyGraph;
