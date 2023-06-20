import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import InferenceGraphs from '~/pages/modelServing/screens/metrics/InferenceGraphs';
import MetricsPageToolbar from '~/pages/modelServing/screens/metrics/MetricsPageToolbar';
import { MetricType } from '~/pages/modelServing/screens/types';
import RuntimeGraphs from './RuntimeGraphs';

type PerformanceTabProps = {
  type?: MetricType;
};

const PerformanceTab: React.FC<PerformanceTabProps> = ({ type }) => (
  <Stack style={{ overflow: 'auto' }}>
    <StackItem>
      <MetricsPageToolbar />
    </StackItem>
    <PageSection style={{ overflow: 'auto', flexShrink: '1' }}>
      {type === MetricType.RUNTIME ? <RuntimeGraphs /> : <InferenceGraphs />}
    </PageSection>
  </Stack>
);

export default PerformanceTab;
