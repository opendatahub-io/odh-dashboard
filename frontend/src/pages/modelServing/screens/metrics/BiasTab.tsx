import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import DIRGraph from '~/pages/modelServing/screens/metrics/DIRGraph';
import MetricsPageToolbar from './MetricsPageToolbar';
import SPDGraph from './SPDGraph';

const BiasTab = () => (
  <Stack>
    <StackItem>
      <MetricsPageToolbar />
    </StackItem>
    <PageSection isFilled>
      <Stack hasGutter>
        <StackItem>
          <SPDGraph />
        </StackItem>
        <StackItem>
          <DIRGraph />
        </StackItem>
      </Stack>
    </PageSection>
  </Stack>
);

export default BiasTab;
