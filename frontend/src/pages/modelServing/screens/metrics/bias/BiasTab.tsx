import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import MetricsPageToolbar from '~/pages/modelServing/screens/metrics/MetricsPageToolbar';
import BiasChartList from '~/pages/modelServing/screens/metrics/bias/BiasChartList';

const BiasTab = () => (
  <Stack>
    <StackItem>
      <MetricsPageToolbar />
    </StackItem>
    <PageSection isFilled>
      <Stack hasGutter>
        <BiasChartList />
      </Stack>
    </PageSection>
  </Stack>
);

export default BiasTab;
