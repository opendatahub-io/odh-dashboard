import * as React from 'react';
import { Card, CardTitle, CardBody, Bullseye, Spinner } from '@patternfly/react-core';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';

export const DWWorkloadsTable: React.FC = () => {
  const { workloads } = React.useContext(DistributedWorkloadsContext);

  if (workloads.error) {
    return (
      <Card isFullHeight>
        <EmptyStateErrorMessage
          title="Error loading workloads"
          bodyText={workloads.error.message}
        />
      </Card>
    );
  }

  if (!workloads.loaded) {
    return (
      <Card isFullHeight>
        <Bullseye style={{ minHeight: 150 }}>
          <Spinner />
        </Bullseye>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Workloads</CardTitle>
      <CardBody>
        <h2>TODO workloads table</h2>
        <pre>{JSON.stringify(workloads.data, undefined, 4)}</pre>
      </CardBody>
    </Card>
  );
};
