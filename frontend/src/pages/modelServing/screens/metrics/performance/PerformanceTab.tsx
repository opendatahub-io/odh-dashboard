import React, { ReactElement } from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import ModelGraphs from '~/pages/modelServing/screens/metrics/performance/ModelGraphs';
import MetricsPageToolbar from '~/concepts/metrics/MetricsPageToolbar';
import { ModelMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import EnsureMetricsAvailable from '~/pages/modelServing/screens/metrics/EnsureMetricsAvailable';

const PerformanceTab = (): ReactElement => (
  <EnsureMetricsAvailable
    metrics={[ModelMetricType.REQUEST_COUNT_SUCCESS, ModelMetricType.REQUEST_COUNT_FAILED]}
    accessDomain="model metrics"
  >
    <Stack data-testid="performance-metrics-loaded">
      <StackItem>
        <MetricsPageToolbar />
      </StackItem>
      <PageSection isFilled>
        <ModelGraphs />
      </PageSection>
    </Stack>
  </EnsureMetricsAvailable>
);
export default PerformanceTab;
