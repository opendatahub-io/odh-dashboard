import React from 'react';
import { InferenceMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { DomainCalculator } from '~/pages/modelServing/screens/metrics/MetricsChart';
import TrustyChart from '~/pages/modelServing/screens/metrics/TrustyChart';
import DIRTooltip from '~/pages/modelServing/screens/metrics/DIRTooltip';

const DirGraph = () => {
  const domainCalc: DomainCalculator = (maxYValue) => ({
    y:
      Math.abs(maxYValue - 1) > 0.2
        ? [1 - Math.abs(maxYValue - 1) - 0.1, 1 + Math.abs(maxYValue - 1) + 0.1]
        : [0.7, 1.3],
  });

  return (
    <TrustyChart
      title="Disparate Impact Ratio"
      abbreviation="DIR"
      trustyMetricType={InferenceMetricType.TRUSTY_AI_DIR}
      tooltip={<DIRTooltip />}
      domainCalc={domainCalc}
      threshold={1.2}
      minThreshold={0.8}
    />
  );
};

export default DirGraph;
