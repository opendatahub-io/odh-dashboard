import * as React from 'react';
import { Card, CardTitle } from '@patternfly/react-core';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { ErrorWorkloadState, LoadingWorkloadState } from './SharedStates';

export const ResourceUsage: React.FC = () => {
  const { workloads } = React.useContext(DistributedWorkloadsContext);
  if (workloads.error) {
    return <ErrorWorkloadState message={workloads.error.message} />;
  }

  if (!workloads.loaded) {
    return <LoadingWorkloadState />;
  }

  return (
    <Card isPlain>
      <CardTitle>Charts Placeholder</CardTitle>
    </Card>
  );
};
