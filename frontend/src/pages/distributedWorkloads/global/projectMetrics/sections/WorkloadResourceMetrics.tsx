import * as React from 'react';
import { Card, CardTitle } from '@patternfly/react-core';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { ErrorWorkloadState, LoadingWorkloadState, NoWorkloadState } from './SharedStates';

export const WorkloadResourceMetrics: React.FC = () => {
  const { workloads } = React.useContext(DistributedWorkloadsContext);

  if (workloads.error) {
    return <ErrorWorkloadState message={workloads.error.message} />;
  }

  if (!workloads.loaded) {
    return <LoadingWorkloadState />;
  }

  if (!workloads.data.length) {
    return <NoWorkloadState />;
  }

  return (
    <Card isPlain>
      <CardTitle>Charts Placeholder</CardTitle>
    </Card>
  );
};
