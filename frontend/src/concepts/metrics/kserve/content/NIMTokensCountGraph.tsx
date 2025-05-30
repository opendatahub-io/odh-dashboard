import React from 'react';
import { NimMetricGraphDefinition } from '#~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '#~/concepts/metrics/types';
import { useFetchNimTokensCountData } from '#~/api';
import MetricsChart from '#~/pages/modelServing/screens/metrics/MetricsChart';
import { MetricsChartTypes } from '#~/pages/modelServing/screens/metrics/types';
import { convertPrometheusNaNToZero } from '#~/pages/modelServing/screens/metrics/utils';

// Graph #3 - Total Prompt Token Count and Total Generation Token Count
type NimTokensCountGraphProps = {
  graphDefinition: NimMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const NimTokensCountGraph: React.FC<NimTokensCountGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { totalPromptTokenCount, totalGenerationTokenCount },
  } = useFetchNimTokensCountData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={[
        ...(graphDefinition.queries[0]
          ? [
              {
                name: graphDefinition.queries[0].title, // "Total Prompt Token Count"
                metric: {
                  ...totalPromptTokenCount,
                  data: convertPrometheusNaNToZero(totalPromptTokenCount.data),
                },
              },
            ]
          : []),
        ...(graphDefinition.queries[1]
          ? [
              {
                name: graphDefinition.queries[1].title, // "Total Generation Token Count"
                metric: {
                  ...totalGenerationTokenCount,
                  data: convertPrometheusNaNToZero(totalGenerationTokenCount.data),
                },
              },
            ]
          : []),
      ]}
      type={MetricsChartTypes.LINE}
    />
  );
};

export default NimTokensCountGraph;
