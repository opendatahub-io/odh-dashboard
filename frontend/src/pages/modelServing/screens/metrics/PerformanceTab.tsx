import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import InferenceGraphs from '~/pages/modelServing/screens/metrics/InferenceGraphs';
import MetricsPageToolbar from '~/pages/modelServing/screens/metrics/MetricsPageToolbar';

const PerformanceTab = () => (
  <Stack>
    <StackItem>
      <MetricsPageToolbar />
    </StackItem>
    <PageSection isFilled>
      <InferenceGraphs />
    </PageSection>
  </Stack>
);

export default PerformanceTab;
