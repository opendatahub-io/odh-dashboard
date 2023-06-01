import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { InferenceMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import TrustyChart from '~/pages/modelServing/screens/metrics/bias/TrustyChart';
import { MetricsChartTypes } from '~/pages/modelServing/screens/metrics/types';

const DIRChart = () => {
  const DEFAULT_MAX_THRESHOLD = 1.2;
  const DEFAULT_MIN_THRESHOLD = 0.8;
  const PADDING = 0.1;

  return (
    <TrustyChart
      title="Disparate Impact Ratio"
      abbreviation="DIR"
      metricType={InferenceMetricType.TRUSTY_AI_DIR}
      tooltip={
        <Stack hasGutter>
          <StackItem>
            Disparate Impact Ratio (DIR) measures imbalances in classifications by calculating the
            ratio between the proportion of the majority and protected classes getting a particular
            outcome.
          </StackItem>
          <StackItem>
            Typically, the further away the DIR is from 1, the more unfair the model. A DIR equal to
            1 indicates a perfectly fair model for the groups and outcomes in question.
          </StackItem>
        </Stack>
      }
      domain={(maxYValue) => ({
        y:
          maxYValue > DEFAULT_MAX_THRESHOLD
            ? [0, maxYValue + PADDING]
            : [0, DEFAULT_MAX_THRESHOLD + PADDING],
      })}
      thresholds={[DEFAULT_MAX_THRESHOLD, DEFAULT_MIN_THRESHOLD]}
      type={MetricsChartTypes.LINE}
    />
  );
};

export default DIRChart;
