import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import DIRGraph from '~/pages/modelServing/screens/metrics/bias/DIRChart';
import BiasMetricChartWrapper from '~/pages/modelServing/screens/metrics/bias/BiasMetricChartWrapper';
import TrustyChart from '~/pages/modelServing/screens/metrics/bias/TrustyChart';
import { InferenceMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import MetricsPageToolbar from '~/pages/modelServing/screens/metrics/MetricsPageToolbar';
import SPDChart from './SPDChart';

const DEFAULT_MAX_THRESHOLD = 0.1;
const DEFAULT_MIN_THRESHOLD = -0.1;
const PADDING = 0.1;
const BiasTab = () => (
  <Stack>
    <StackItem>
      <MetricsPageToolbar />
    </StackItem>
    <PageSection isFilled>
      <Stack hasGutter>
        <StackItem>
          <BiasMetricChartWrapper name="credit score - female high">
            <TrustyChart
              title="Statistical Parity Difference"
              abbreviation="SPD"
              metricType={InferenceMetricType.TRUSTY_AI_SPD}
              domain={(maxYValue) => ({
                y:
                  maxYValue > DEFAULT_MAX_THRESHOLD
                    ? [-1 * maxYValue - PADDING, maxYValue + PADDING]
                    : [DEFAULT_MIN_THRESHOLD - PADDING, DEFAULT_MAX_THRESHOLD + PADDING],
              })}
              thresholds={[DEFAULT_MAX_THRESHOLD, DEFAULT_MIN_THRESHOLD]}
            />
          </BiasMetricChartWrapper>
        </StackItem>
      </Stack>
    </PageSection>
  </Stack>
);

export default BiasTab;
