import React from 'react';
import KservePerformanceGraphs from '#~/concepts/metrics/kserve/content/KservePerformanceGraphs';
import { KserveMetricsContext } from '#~/concepts/metrics/kserve/KserveMetricsContext';

const KserveMetricsContent: React.FC = () => {
  const { namespace, graphDefinitions, timeframe, lastUpdateTime } =
    React.useContext(KserveMetricsContext);

  return (
    <KservePerformanceGraphs
      namespace={namespace}
      graphDefinitions={graphDefinitions}
      timeframe={timeframe}
      end={lastUpdateTime}
    />
  );
};

export default KserveMetricsContent;
