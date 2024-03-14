import * as React from 'react';
import { Card, CardTitle, CardBody, Bullseye, Spinner } from '@patternfly/react-core';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';

export const DWStatusOverviewDonutChart: React.FC = () => {
  const { workloadCurrentMetrics } = React.useContext(DistributedWorkloadsContext);

  if (workloadCurrentMetrics.error) {
    return (
      <Card isFullHeight>
        <EmptyStateErrorMessage
          title="Error loading current workload status"
          bodyText={workloadCurrentMetrics.error.message}
        />
      </Card>
    );
  }

  if (!workloadCurrentMetrics.loaded) {
    return (
      <Card isFullHeight>
        <Bullseye style={{ minHeight: 150 }}>
          <Spinner />
        </Bullseye>
      </Card>
    );
  }

  const { numJobsActive, numJobsFailed, numJobsSucceeded, numJobsInadmissible, numJobsPending } =
    workloadCurrentMetrics.data;

  return (
    <Card isFullHeight>
      <CardTitle>Status overview</CardTitle>
      <CardBody>
        <h2>TODO status overview donut chart</h2>
        <ul>
          <li>Running: {numJobsActive.data}</li>
          <li>Succeeded: {numJobsSucceeded.data}</li>
          <li>Failed: {numJobsFailed.data}</li>
          <li>Inadmissible: {numJobsInadmissible.data}</li>
          <li>Pending: {numJobsPending.data}</li>
        </ul>
      </CardBody>
    </Card>
  );
};
