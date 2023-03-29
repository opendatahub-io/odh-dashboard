import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import MetricsPageToolbar from './MetricsPageToolbar';
import BiasGraph from './BiasGraph';

const QualityTab = () => (
  <Stack>
    <StackItem>
      <MetricsPageToolbar />
    </StackItem>
    <PageSection isFilled>
      <BiasGraph />
    </PageSection>
  </Stack>
);

export default QualityTab;
