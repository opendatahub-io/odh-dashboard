import React from 'react';
import {
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { WarningTriangleIcon } from '@patternfly/react-icons';
import { InferenceServiceKind } from '~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { isModelMesh } from '~/pages/modelServing/utils';
import MetricsPageToolbar from '~/concepts/metrics/MetricsPageToolbar';
import ModelGraphs from '~/pages/modelServing/screens/metrics/performance/ModelGraphs';

type PerformanceTabsProps = {
  model: InferenceServiceKind;
};

const PerformanceTab: React.FC<PerformanceTabsProps> = ({ model }) => {
  const modelMesh = isModelMesh(model);
  const kserveMetricsEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;

  if (!modelMesh && !kserveMetricsEnabled) {
    return (
      <Stack data-testid="performance-metrics-loaded">
        <StackItem>
          <EmptyState variant="full">
            <EmptyStateHeader
              titleText="Single-model serving platform model metrics are not enabled."
              headingLevel="h4"
              icon={<EmptyStateIcon icon={WarningTriangleIcon} />}
              alt=""
              data-testid="kserve-metrics-disabled"
            />
          </EmptyState>
        </StackItem>
      </Stack>
    );
  }

  return (
    <Stack data-testid="performance-metrics-loaded">
      <StackItem>
        <MetricsPageToolbar />
      </StackItem>
      <PageSection isFilled>
        <ModelGraphs model={model} />
      </PageSection>
    </Stack>
  );
};

export default PerformanceTab;
