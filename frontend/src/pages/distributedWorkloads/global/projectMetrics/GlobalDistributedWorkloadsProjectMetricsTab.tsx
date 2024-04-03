import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { useUser } from '~/redux/selectors';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { RequestedResources } from './sections/RequestedResources';
import { TopResourceConsumingWorkloads } from './sections/TopResourceConsumingWorkloads';
import { WorkloadResourceMetricsTable } from './sections/WorkloadResourceMetricsTable';
import { DWSectionCard } from './sections/DWSectionCard';

const GlobalDistributedWorkloadsProjectMetricsTab: React.FC = () => {
  const { isAdmin } = useUser();

  const { clusterQueue, localQueues } = React.useContext(DistributedWorkloadsContext);
  const requiredFetches = [clusterQueue, localQueues];
  const error = requiredFetches.find((f) => !!f.error)?.error;
  const loaded = requiredFetches.every((f) => f.loaded);

  if (error) {
    return (
      <EmptyStateErrorMessage
        title="Error loading distributed workload metrics"
        bodyText={error.message}
      />
    );
  }

  if (!loaded) {
    return (
      <Bullseye style={{ minHeight: 150 }}>
        <Spinner />
      </Bullseye>
    );
  }

  // clusterQueue.data will only be defined here if it has spec.resourceGroups (see DistributedWorkloadsContext)
  if (!clusterQueue.data || localQueues.data.length === 0) {
    return (
      <EmptyState>
        <EmptyStateHeader
          titleText="Quota is not set"
          headingLevel="h4"
          icon={<EmptyStateIcon icon={WrenchIcon} />}
        />
        <EmptyStateBody>Select another project or set the quota for this project.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <DWSectionCard
            title="Requested resources"
            helpTooltip={
              isAdmin
                ? undefined
                : 'In this section, all projects refers to all of the projects that share the specified resource. You might not have access to all of these projects.'
            }
            content={<RequestedResources />}
          />
        </StackItem>
        <StackItem>
          <DWSectionCard
            title="Top resource-consuming distributed workloads"
            content={<TopResourceConsumingWorkloads />}
          />
        </StackItem>
        <StackItem>
          <DWSectionCard
            title="Distributed workload resource metrics"
            hasDivider={false}
            content={<WorkloadResourceMetricsTable />}
          />
        </StackItem>
      </Stack>
    </>
  );
};

export default GlobalDistributedWorkloadsProjectMetricsTab;
