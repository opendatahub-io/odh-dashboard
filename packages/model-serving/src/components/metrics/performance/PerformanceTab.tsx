import React from 'react';
import { EmptyState, PageSection, Stack, StackItem } from '@patternfly/react-core';
import { WarningTriangleIcon } from '@patternfly/react-icons';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import MetricsPageToolbar from '@odh-dashboard/internal/concepts/metrics/MetricsPageToolbar';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import ModelGraphs from './ModelGraphs';

type PerformanceTabsProps = {
  model: InferenceServiceKind;
};

const PerformanceTab: React.FC<PerformanceTabsProps> = ({ model }) => {
  // Always KServe
  const kserveMetricsEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;

  if (!kserveMetricsEnabled) {
    return (
      <Stack data-testid="performance-metrics-loaded">
        <StackItem>
          <EmptyState
            data-testid="kserve-metrics-disabled"
            headingLevel="h4"
            icon={WarningTriangleIcon}
            titleText="Single-model serving platform model metrics are not enabled."
            variant="full"
          />
        </StackItem>
      </Stack>
    );
  }

  return (
    <Stack data-testid="performance-metrics-loaded">
      <StackItem>
        <MetricsPageToolbar />
      </StackItem>
      <PageSection hasBodyWrapper={false} isFilled>
        <ModelGraphs model={model} />
      </PageSection>
    </Stack>
  );
};

export default PerformanceTab;
