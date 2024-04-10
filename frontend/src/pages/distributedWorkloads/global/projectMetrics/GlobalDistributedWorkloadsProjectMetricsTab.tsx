import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { useUser } from '~/redux/selectors';
import { RequestedResources } from './sections/RequestedResources';
import { TopResourceConsumingWorkloads } from './sections/TopResourceConsumingWorkloads';
import { WorkloadResourceMetricsTable } from './sections/WorkloadResourceMetricsTable';
import { DWSectionCard } from './sections/DWSectionCard';

const GlobalDistributedWorkloadsProjectMetricsTab: React.FC = () => {
  const { isAdmin } = useUser();

  return (
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
  );
};

export default GlobalDistributedWorkloadsProjectMetricsTab;
