import * as React from 'react';
import { Bullseye, Flex, FlexItem, Spinner } from '@patternfly/react-core';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { ResourceUsage } from './sections/ResourceUsage';
import { TopResourceConsumingWorkloads } from './sections/TopResourceConsumingWorkloads';
import { WorkloadResourceMetrics } from './sections/WorkloadResourceMetrics';
import { DWSectionCard } from './sections/DWSectionCard';

const GlobalDistributedWorkloadsProjectMetricsTab: React.FC = () => {
  const { projectCurrentMetrics } = React.useContext(DistributedWorkloadsContext);

  if (projectCurrentMetrics.error) {
    return (
      <EmptyStateErrorMessage
        title="Error loading distributed workload metrics"
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

  //TODO: need 'no quota' logic
  // if (false) {
  //   return (
  //     <EmptyState>
  //       <EmptyStateHeader
  //         titleText="Quota is not set"
  //         headingLevel="h4"
  //         icon={<EmptyStateIcon icon={WrenchIcon} />}
  //       />
  //       <EmptyStateBody>Select another project or set the quota for this project.</EmptyStateBody>
  //     </EmptyState>
  //   );
  // }

  return (
    <>
      <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
        <FlexItem>
          <DWSectionCard title="Resource Usage" content={<ResourceUsage />} />
        </FlexItem>
        <FlexItem>
          <DWSectionCard
            title="Top resource-consuming distributed workloads"
            content={<TopResourceConsumingWorkloads />}
          />
        </FlexItem>
        <FlexItem>
          <DWSectionCard
            title="Distributed workload resource metrics"
            content={<WorkloadResourceMetrics />}
          />
        </FlexItem>
      </Flex>
    </>
  );
};

export default GlobalDistributedWorkloadsProjectMetricsTab;
