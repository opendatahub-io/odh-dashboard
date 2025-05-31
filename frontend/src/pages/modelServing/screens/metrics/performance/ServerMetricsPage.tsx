import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import React, { ReactElement } from 'react';
import MetricsPageToolbar from '#~/concepts/metrics/MetricsPageToolbar';
import ServerGraphs from '#~/pages/modelServing/screens/metrics/performance/ServerGraphs';
import { ServerMetricType } from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import EnsureMetricsAvailable from '#~/pages/modelServing/screens/metrics/EnsureMetricsAvailable';

const ServerMetricsPage = (): ReactElement => (
  <EnsureMetricsAvailable
    metrics={[
      ServerMetricType.AVG_RESPONSE_TIME,
      ServerMetricType.REQUEST_COUNT,
      ServerMetricType.CPU_UTILIZATION,
      ServerMetricType.MEMORY_UTILIZATION,
    ]}
    accessDomain="model server metrics"
  >
    <Stack data-testid="server-metrics-loaded">
      <StackItem>
        <MetricsPageToolbar />
      </StackItem>
      <PageSection hasBodyWrapper={false} isFilled>
        <ServerGraphs />
      </PageSection>
    </Stack>
  </EnsureMetricsAvailable>
);
export default ServerMetricsPage;
