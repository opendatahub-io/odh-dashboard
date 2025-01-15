import React from 'react';
import { EmptyState, PageSection, Stack, StackItem } from '@patternfly/react-core';
import { WarningTriangleIcon } from '@patternfly/react-icons';
import { InferenceServiceKind } from '~/k8sTypes';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { isModelMesh } from '~/pages/modelServing/utils';
import MetricsPageToolbar from '~/concepts/metrics/MetricsPageToolbar';
import NimMetrics from './NimMetrics';

type NIMTabProps = {
  model: InferenceServiceKind;
};

const NIMTab: React.FC<NIMTabProps> = ({ model }) => {
  const modelMesh = isModelMesh(model);
  const NIMMetricsEnabled = useIsAreaAvailable(SupportedArea.NIM_MODEL).status;

  if (!modelMesh && !NIMMetricsEnabled) {
    return (
      <Stack data-testid="nim-metrics-loaded">
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
    <Stack data-testid="nim-metrics-loaded">
      <StackItem>
        <MetricsPageToolbar />
      </StackItem>
      <PageSection hasBodyWrapper={false} isFilled>
        <NimMetrics modelName={model.metadata.name} />
      </PageSection>
    </Stack>
  );
};

export default NIMTab;
