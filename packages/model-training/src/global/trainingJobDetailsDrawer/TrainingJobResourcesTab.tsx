import * as React from 'react';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Title,
  Button,
  StackItem,
  Stack,
  Skeleton,
  Content,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { getAllConsumedResources } from './utils';
import useClusterQueueFromLocalQueue from '../../hooks/useClusterQueueFromLocalQueue';
import useClusterQueue from '../../hooks/useClusterQueue';
import { TrainJobKind } from '../../k8sTypes';

type TrainingJobResourcesTabProps = {
  job: TrainJobKind;
};

const TrainingJobResourcesTab: React.FC<TrainingJobResourcesTabProps> = ({ job }) => {
  const { clusterQueueName, loaded: clusterQueueLoaded } = useClusterQueueFromLocalQueue(
    job.metadata.labels?.['kueue.x-k8s.io/queue-name'],
    job.metadata.namespace,
  );

  const { clusterQueue, loaded: clusterQueueDataLoaded } = useClusterQueue(clusterQueueName);

  const quotaSource = clusterQueue?.spec.cohort || '-';

  const consumedResources = clusterQueue ? getAllConsumedResources(clusterQueue) : [];

  return (
    <Stack hasGutter>
      <StackItem className="pf-v6-u-mt-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h6" size="md" data-testid="node-configurations-section">
            Node configurations
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Nodes:</DescriptionListTerm>
            <DescriptionListDescription data-testid="nodes-value">
              <Button
                variant="link"
                isInline
                icon={<PencilAltIcon />}
                iconPosition="end"
                style={{ fontSize: 'inherit', padding: 0 }}
                isDisabled // TODO: RHOAIENG-37576 Uncomment this when scaling is implemented
                data-testid="nodes-edit-button"
              >
                {job.spec.trainer.numNodes}
              </Button>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Processes per node:
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="processes-per-node-value">
              {job.spec.trainer.numProcPerNode || '-'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
      <StackItem className="pf-v6-u-mt-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h3" size="md" data-testid="resources-per-node-section">
            Resources per node
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              CPU requests:
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="cpu-requests-value">
              {job.spec.trainer.resourcesPerNode?.requests?.cpu || '-'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>CPU limits:</DescriptionListTerm>
            <DescriptionListDescription data-testid="cpu-limits-value">
              {job.spec.trainer.resourcesPerNode?.limits?.cpu || '-'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Memory requests:
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="memory-requests-value">
              {job.spec.trainer.resourcesPerNode?.requests?.memory || '-'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Memory limits:
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="memory-limits-value">
              {job.spec.trainer.resourcesPerNode?.limits?.memory || '-'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
      <StackItem className="pf-v6-u-mt-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h3" size="md" data-testid="cluster-queue-section">
            Cluster queue
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Queue:</DescriptionListTerm>
            {clusterQueueLoaded ? (
              <DescriptionListDescription data-testid="queue-value">
                {clusterQueueName}
              </DescriptionListDescription>
            ) : (
              <Skeleton width="100px" />
            )}
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
      <StackItem className="pf-v6-u-mt-md pf-v6-u-mb-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h3" size="md" data-testid="quotas-section">
            Quotas and consumption
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Quota source:
            </DescriptionListTerm>
            {clusterQueueDataLoaded ? (
              <DescriptionListDescription data-testid="quota-source-value">
                {quotaSource}
              </DescriptionListDescription>
            ) : (
              <Skeleton width="150px" />
            )}
          </DescriptionListGroup>
          <DescriptionListGroup>
            {clusterQueueDataLoaded ? (
              <DescriptionListDescription data-testid="consumed-quota-value">
                {consumedResources.length > 0 ? (
                  <Stack hasGutter>
                    {consumedResources.map((resource) => (
                      <StackItem key={resource.name}>
                        <DescriptionListGroup>
                          <DescriptionListTerm style={{ fontWeight: 'normal' }}>
                            {resource.label}
                          </DescriptionListTerm>
                          <DescriptionListDescription style={{ whiteSpace: 'nowrap' }}>
                            <Stack>
                              <StackItem>
                                <Content>Total: {resource.total}</Content>
                              </StackItem>
                              <StackItem>
                                <Content style={{ whiteSpace: 'nowrap' }}>
                                  Consumed: {resource.consumed} ({resource.percentage}%)
                                </Content>
                              </StackItem>
                            </Stack>
                          </DescriptionListDescription>
                        </DescriptionListGroup>
                      </StackItem>
                    ))}
                  </Stack>
                ) : (
                  '-'
                )}
              </DescriptionListDescription>
            ) : (
              <Skeleton width="150px" />
            )}
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
    </Stack>
  );
};

export default TrainingJobResourcesTab;
