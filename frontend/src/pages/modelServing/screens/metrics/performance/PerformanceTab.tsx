import React from 'react';
import {
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { PendingIcon } from '@patternfly/react-icons';
import { InferenceServiceKind } from '~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import MetricsPageToolbar from '~/concepts/metrics/MetricsPageToolbar';
import { isModelMesh } from '~/pages/modelServing/utils';
import ModelGraphs from '~/pages/modelServing/screens/metrics/performance/ModelGraphs';
import { ModelMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import EnsureMetricsAvailable from '~/pages/modelServing/screens/metrics/EnsureMetricsAvailable';

type PerformanceTabsProps = {
  model: InferenceServiceKind;
};

const PerformanceTab: React.FC<PerformanceTabsProps> = ({ model }) => {
  const kserve = !isModelMesh(model);
  const kserveMetricsEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;

  if (kserve && kserveMetricsEnabled) {
    return (
      <EmptyState variant="full" data-testid="kserve-metrics-page">
        <EmptyStateHeader
          titleText="Single-model serving platform model metrics coming soon."
          headingLevel="h4"
          icon={<EmptyStateIcon icon={PendingIcon} />}
          alt=""
        />
      </EmptyState>
    );
  }

  return (
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
};

export default PerformanceTab;
