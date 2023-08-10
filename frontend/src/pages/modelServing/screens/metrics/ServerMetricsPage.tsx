import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';
import MetricsPageToolbar from '~/pages/modelServing/screens/metrics/MetricsPageToolbar';
import ServerGraphs from '~/pages/modelServing/screens/metrics/ServerGraphs';
import { ServerMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import EnsureMetricsAvailable from '~/pages/modelServing/screens/metrics/EnsureMetricsAvailable';

const ServerMetricsPage = () => (
  <EnsureMetricsAvailable
    metrics={[
      ServerMetricType.AVG_RESPONSE_TIME,
      ServerMetricType.REQUEST_COUNT,
      ServerMetricType.CPU_UTILIZATION,
      ServerMetricType.MEMORY_UTILIZATION,
    ]}
    accessDomain="model server metrics"
  >
    <Stack>
      <StackItem>
        <MetricsPageToolbar />
      </StackItem>
      <PageSection isFilled>
        <ServerGraphs />
      </PageSection>
    </Stack>
  </EnsureMetricsAvailable>
);
export default ServerMetricsPage;
