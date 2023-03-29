import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import DIRGraph from '~/pages/modelServing/screens/metrics/DIRChart';
import MetricsPageToolbar from './MetricsPageToolbar';
import SPDChart from './SPDChart';

const BiasTab = () => (
  <Stack>
    <StackItem>
      <MetricsPageToolbar />
    </StackItem>
    <PageSection isFilled>
      <Stack hasGutter>
        <StackItem>
          <SPDChart />
        </StackItem>
        <StackItem>
          <DIRGraph />
        </StackItem>
      </Stack>
    </PageSection>
  </Stack>
);

export default BiasTab;
