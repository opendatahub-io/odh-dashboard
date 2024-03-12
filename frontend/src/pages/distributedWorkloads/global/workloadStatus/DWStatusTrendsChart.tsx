import * as React from 'react';
import { Card, CardTitle, CardBody, Bullseye, Spinner } from '@patternfly/react-core';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';

export const DWStatusTrendsChart: React.FC = () => {
  const { workloadTrendMetrics } = React.useContext(DistributedWorkloadsContext);

  if (workloadTrendMetrics.error) {
    return (
      <Card isFullHeight>
        <EmptyStateErrorMessage
          title="Error loading workload status trends"
          bodyText={workloadTrendMetrics.error.message}
        />
      </Card>
    );
  }

  if (!workloadTrendMetrics.loaded) {
    return (
      <Card isFullHeight>
        <Bullseye style={{ minHeight: 150 }}>
          <Spinner />
        </Bullseye>
      </Card>
    );
  }

  const { jobsActiveTrend, jobsInadmissibleTrend, jobsPendingTrend } = workloadTrendMetrics.data;

  return (
    <Card isFullHeight>
      <CardTitle>Status trends</CardTitle>
      <CardBody
        style={{
          overflowX: 'scroll',
        }} /* TODO remove this style when we replace the raw JSON */
      >
        <h2>TODO status trends line chart</h2>
        <h3>Active jobs trend:</h3>
        <pre>{JSON.stringify(jobsActiveTrend.data)}</pre>
        <br />
        <h3>Inadmissible jobs trend:</h3>
        <pre>{JSON.stringify(jobsInadmissibleTrend.data)}</pre>
        <br />
        <h3>Pending jobs trend:</h3>
        <pre>{JSON.stringify(jobsPendingTrend.data)}</pre>
      </CardBody>
    </Card>
  );
};
