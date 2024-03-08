import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';

// TODO mturley render a "no data" state when we get undefined back for some metrics - why might we hit this? is there a message we can display about making sure things are configured correctly?

const GlobalDistributedWorkloadsProjectMetricsTab: React.FC = () => {
  const { projectMetrics, namespace } = React.useContext(DistributedWorkloadsContext);

  if (projectMetrics.error) {
    return (
      <EmptyStateErrorMessage
        title="Error loading workload metrics"
        bodyText={projectMetrics.error.message}
      />
    );
  }

  if (!projectMetrics.loaded) {
    return (
      <Bullseye style={{ minHeight: 150 }}>
        <Spinner />
      </Bullseye>
    );
  }

  const { cpuRequested, cpuUtilized } = projectMetrics.data;

  return (
    <>
      <h1>TODO tab content for project metrics -- these are placeholders</h1>
      <br />
      <h1>
        CPU requested for project {namespace}: {cpuRequested.data}
      </h1>
      <h1>
        CPU utilized for project {namespace}: {cpuUtilized.data}
      </h1>
    </>
  );
};

export default GlobalDistributedWorkloadsProjectMetricsTab;
