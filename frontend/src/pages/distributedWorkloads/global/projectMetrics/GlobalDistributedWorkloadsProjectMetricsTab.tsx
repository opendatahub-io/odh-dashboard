import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';

const GlobalDistributedWorkloadsProjectMetricsTab: React.FC = () => {
  const { projectCurrentMetrics } = React.useContext(DistributedWorkloadsContext);

  if (projectCurrentMetrics.error) {
    return (
      <EmptyStateErrorMessage
        title="Error loading workload metrics"
        bodyText={projectCurrentMetrics.error.message}
      />
    );
  }

  if (!projectCurrentMetrics.loaded) {
    return (
      <Bullseye style={{ minHeight: 150 }}>
        <Spinner />
      </Bullseye>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { getWorkloadCurrentUsage, topResourceConsumingWorkloads } = projectCurrentMetrics;
  // eslint-disable-next-line no-console
  console.log({ topResourceConsumingWorkloads });

  return (
    <>
      <h1>TODO tab content for project metrics -- these are placeholders</h1>
    </>
  );
};

export default GlobalDistributedWorkloadsProjectMetricsTab;
