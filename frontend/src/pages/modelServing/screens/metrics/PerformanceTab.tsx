import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import ModelGraphs from '~/pages/modelServing/screens/metrics/ModelGraphs';
import MetricsPageToolbar from '~/pages/modelServing/screens/metrics/MetricsPageToolbar';
import { PerformanceMetricType } from '~/pages/modelServing/screens/types';
import ServerGraphs from './ServerGraphs';

type PerformanceTabProps = {
  type?: PerformanceMetricType;
};

const PerformanceTab: React.FC<PerformanceTabProps> = ({ type }) => (
  <Stack>
    <StackItem>
      <MetricsPageToolbar />
    </StackItem>
    <PageSection isFilled>
      {type === PerformanceMetricType.SERVER ? <ServerGraphs /> : <ModelGraphs />}
    </PageSection>
  </Stack>
);

export default PerformanceTab;
