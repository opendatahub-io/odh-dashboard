import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { RequestedResources } from './sections/RequestedResources';
import { TopResourceConsumingWorkloads } from './sections/TopResourceConsumingWorkloads';
import { WorkloadResourceMetricsTable } from './sections/WorkloadResourceMetricsTable';
import { DWSectionCard } from './sections/DWSectionCard';

const PopoverContent = () => (
  <>
    In this section, <strong>all projects</strong> refers to all of the projects that share the
    specified resource. You might not have access to all of these projects.
  </>
);
const GlobalDistributedWorkloadsProjectMetricsTab: React.FC = () => (
  <Stack hasGutter>
    <StackItem data-testid="dw-requested-resources">
      <DWSectionCard
        title="Requested resources"
        helpTooltip={<PopoverContent />}
        content={<RequestedResources />}
      />
    </StackItem>
    <StackItem data-testid="dw-top-consuming-workloads">
      <DWSectionCard
        title="Top 5 resource-consuming workload metrics"
        content={<TopResourceConsumingWorkloads />}
      />
    </StackItem>
    <StackItem data-testid="dw-workload-resource-metrics">
      <DWSectionCard
        title="Distributed workload resource metrics"
        hasDivider={false}
        content={<WorkloadResourceMetricsTable />}
      />
    </StackItem>
  </Stack>
);

export default GlobalDistributedWorkloadsProjectMetricsTab;
