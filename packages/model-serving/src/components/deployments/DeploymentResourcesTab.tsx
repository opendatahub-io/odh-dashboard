import React from 'react';
import {
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Skeleton,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { getAllConsumedResources } from '@odh-dashboard/internal/utilities/clusterQueueUtils';
import useAssignedFlavor from '@odh-dashboard/internal/utilities/useAssignedFlavor';
import useClusterQueue from '@odh-dashboard/internal/utilities/useClusterQueue';
import useClusterQueueFromLocalQueue from '../../shared/kueue/useClusterQueueFromLocalQueue';

type DeploymentResourcesTabProps = {
  localQueueName: string | undefined;
  namespace: string;
  deploymentName: string | undefined;
};

const DeploymentResourcesTab: React.FC<DeploymentResourcesTabProps> = ({
  localQueueName,
  namespace,
  deploymentName,
}) => {
  const {
    clusterQueueName,
    loaded: clusterQueueNameLoaded,
    error: clusterQueueNameError,
  } = useClusterQueueFromLocalQueue(localQueueName, namespace);

  const shouldFetchClusterQueue = Boolean(localQueueName && clusterQueueName);

  const {
    clusterQueue,
    loaded: clusterQueueLoaded,
    error: clusterQueueError,
  } = useClusterQueue(shouldFetchClusterQueue ? clusterQueueName : undefined);

  const assignedFlavorName = useAssignedFlavor(namespace, localQueueName, deploymentName);

  const quotaSource = clusterQueue?.spec.cohortName ?? '-';
  const consumedResources = clusterQueue
    ? getAllConsumedResources(clusterQueue, assignedFlavorName)
    : [];

  const hasError = Boolean(clusterQueueNameError || clusterQueueError);
  const loaded = clusterQueueNameLoaded && (!clusterQueueName || clusterQueueLoaded);

  if (!localQueueName || (clusterQueueNameLoaded && !clusterQueueName && !hasError)) {
    return (
      <Content data-testid="deployment-resources-no-queue">
        No cluster queue information for this deployment.
      </Content>
    );
  }

  if (!loaded && !hasError) {
    return (
      <Stack hasGutter data-testid="deployment-resources-tab">
        <StackItem>
          <Skeleton data-testid="cluster-queue-section" />
        </StackItem>
        <StackItem>
          <Skeleton data-testid="quotas-section" />
        </StackItem>
      </Stack>
    );
  }

  return (
    <Stack hasGutter={false} data-testid="deployment-resources-tab">
      <StackItem>
        <DescriptionList
          isHorizontal
          horizontalTermWidthModifier={{ default: '5ch' }}
          data-testid="cluster-queue-section"
          isCompact
        >
          <Title headingLevel="h6" size="md">
            Cluster queue
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Queue:</DescriptionListTerm>
            <DescriptionListDescription data-testid="queue-value">
              {hasError ? '-' : clusterQueueName ?? '-'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
      <StackItem className="pf-v6-u-mt-md pf-v6-u-mb-md">
        <Stack hasGutter data-testid="quotas-section">
          <StackItem>
            <Title headingLevel="h6" size="md">
              Quotas and consumption
            </Title>
          </StackItem>
          <StackItem>
            <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '10ch' }}>
              <DescriptionListGroup>
                <DescriptionListTerm style={{ fontWeight: 'normal' }}>
                  Quota source:
                </DescriptionListTerm>
                <DescriptionListDescription data-testid="quota-source-value">
                  {hasError ? '-' : quotaSource}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </StackItem>
          {hasError ? (
            <StackItem>
              <Content>Unable to load consumption data.</Content>
            </StackItem>
          ) : (
            consumedResources.map((resource) => (
              <StackItem key={resource.name}>
                <Content component={ContentVariants.dd}>
                  {resource.label.charAt(0).toUpperCase() + resource.label.slice(1)}
                </Content>
                <Stack hasGutter={false} className="pf-v6-u-pl-md">
                  <StackItem>
                    <Content>Total: {resource.total}</Content>
                  </StackItem>
                  <StackItem>
                    <Content data-testid="consumed-quota-value">
                      Consumed: {resource.consumed} ({resource.percentage}%)
                    </Content>
                  </StackItem>
                </Stack>
              </StackItem>
            ))
          )}
        </Stack>
      </StackItem>
    </Stack>
  );
};

export default DeploymentResourcesTab;
