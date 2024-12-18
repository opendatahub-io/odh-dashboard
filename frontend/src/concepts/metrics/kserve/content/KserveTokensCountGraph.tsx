import React from 'react';
import { KserveMetricGraphDefinition } from '~/concepts/metrics/kserve/types';
import { TimeframeTitle } from '~/concepts/metrics/types';
import { useFetchKserveTokensCountData } from '~/api/prometheus/kservePerformanceMetrics';
import MetricsChart from '~/pages/modelServing/screens/metrics/MetricsChart';
import { MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';
import { convertPrometheusNaNToZero } from '~/pages/modelServing/screens/metrics/utils';

// Graph #3 - Total Prompt Token Count and Total Generation Token Count
type KserveTokensCountGraphProps = {
  graphDefinition: KserveMetricGraphDefinition;
  timeframe: TimeframeTitle;
  end: number;
  namespace: string;
};

const KserveTokensCountGraph: React.FC<KserveTokensCountGraphProps> = ({
  graphDefinition,
  timeframe,
  end,
  namespace,
}) => {
  const {
    data: { totalPromptTokenCount, totalGenerationTokenCount },
  } = useFetchKserveTokensCountData(graphDefinition, timeframe, end, namespace);

  return (
    <MetricsChart
      title={graphDefinition.title}
      metrics={[
        {
          name: graphDefinition.queries[0].title, // "total Prompt TokenC ount"
          metric: {
            ...totalPromptTokenCount,
            data: convertPrometheusNaNToZero(totalPromptTokenCount.data),
          },
          color: "blue", // Custom color for "Requests waiting"
        },
        {
          name: graphDefinition.queries[1].title, // "total Generation Token Count"
          metric: {
            ...totalGenerationTokenCount,
            data: convertPrometheusNaNToZero(totalPromptTokenCount.data),
          },
          color: "green", 
        },
      ]}
      type={MetricsChartTypes.DONUT}
    />
  );
};

export default KserveTokensCountGraph;
