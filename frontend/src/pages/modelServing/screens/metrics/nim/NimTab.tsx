import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import { InferenceServiceKind } from '#~/k8sTypes';
import MetricsPageToolbar from '#~/concepts/metrics/MetricsPageToolbar';
import NimMetrics from './NimMetrics';

type NIMTabProps = {
  model: InferenceServiceKind;
};

const NIMTab: React.FC<NIMTabProps> = ({ model }) => (
  <Stack data-testid="nim-metrics-loaded">
    <StackItem>
      <MetricsPageToolbar />
    </StackItem>
    <PageSection hasBodyWrapper={false} isFilled>
      <NimMetrics modelName={model.metadata.name} />
    </PageSection>
  </Stack>
);

export default NIMTab;
