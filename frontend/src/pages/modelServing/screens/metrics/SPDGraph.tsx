import React from 'react';
import { InferenceMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { DomainCalculator } from '~/pages/modelServing/screens/metrics/MetricsChart';
import TrustyChart from '~/pages/modelServing/screens/metrics/TrustyChart';
import SPDTooltip from '~/pages/modelServing/screens/metrics/SPDTooltip';

const SPDGraph = () => {
  const domainCalc: DomainCalculator = (maxYValue) => ({
    y: maxYValue > 0.1 ? [-1 * maxYValue - 0.1, maxYValue + 0.1] : [-0.2, 0.2],
  });

  return (
    <TrustyChart
      title="Statistical Parity Difference"
      abbreviation="SPD"
      trustyMetricType={InferenceMetricType.TRUSTY_AI_SPD}
      tooltip={<SPDTooltip />}
      domainCalc={domainCalc}
      threshold={0.1}
      minThreshold={-0.1}
    />
  );
};
export default SPDGraph;
