import React from 'react';
import NimPerformanceGraphs from '#~/concepts/metrics/kserve/content/NimPerformanceGraphs';
import { NimMetricsContext } from '#~/concepts/metrics/kserve/NimMetricsContext';

const NimMetricsContent: React.FC = () => {
  const { namespace, graphDefinitions, timeframe, lastUpdateTime } =
    React.useContext(NimMetricsContext);

  return (
    <NimPerformanceGraphs
      namespace={namespace}
      graphDefinitions={graphDefinitions}
      timeframe={timeframe}
      end={lastUpdateTime}
    />
  );
};

export default NimMetricsContent;
