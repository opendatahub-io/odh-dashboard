import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { InferenceMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import TrustyChart from '~/pages/modelServing/screens/metrics/TrustyChart';
import { DomainCalculator } from '~/pages/modelServing/screens/metrics/types';

const SPDChart = () => {
  const DEFAULT_MAX_THRESHOLD = 0.1;
  const DEFAULT_MIN_THRESHOLD = -0.1;

  const domainCalc: DomainCalculator = (maxYValue) => ({
    y: maxYValue > 0.1 ? [-1 * maxYValue - 0.1, maxYValue + 0.1] : [-0.2, 0.2],
  });

  return (
    <TrustyChart
      title="Statistical Parity Difference"
      abbreviation="SPD"
      metricType={InferenceMetricType.TRUSTY_AI_SPD}
      tooltip={
        <Stack hasGutter>
          <StackItem>
            Statistical Parity Difference (SPD) measures imbalances in classifications by
            calculating the difference between the proportion of the majority and protected classes
            getting a particular outcome.
          </StackItem>
          <StackItem>
            Typically, -0.1 &lt; SPD &lt; 0.1 indicates a fair model, while a value outside those
            bounds indicates an unfair model for the groups and outcomes in question.
          </StackItem>
        </Stack>
      }
      domain={domainCalc}
      thresholds={[DEFAULT_MAX_THRESHOLD, DEFAULT_MIN_THRESHOLD]}
    />
  );
};
export default SPDChart;
