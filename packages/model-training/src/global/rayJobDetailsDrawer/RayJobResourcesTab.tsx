import * as React from 'react';
import {
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Title,
  StackItem,
  Stack,
  Skeleton,
  Button,
} from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { getAllConsumedResources } from '../trainingJobDetailsDrawer/utils';
import useClusterQueueFromLocalQueue from '../../hooks/useClusterQueueFromLocalQueue';
import useClusterQueue from '../../hooks/useClusterQueue';
import { RayJobKind, RayContainerResources, RayWorkerGroupSpec } from '../../k8sTypes';
import { useRayClusterSpec } from '../../hooks/useRayClusterSpec';
import { useModelTrainingContext } from '../ModelTrainingContext';
import { KUEUE_MANAGED_LABEL, KUEUE_QUEUE_LABEL } from '../../const';

type RayJobResourcesTabProps = {
  job: RayJobKind;
  nodeCount: number;
  canScaleNodes?: boolean;
  onScaleNodes?: () => void;
};

const getWorkerResources = (group: RayWorkerGroupSpec): RayContainerResources => {
  const containers = group.template.spec?.containers;
  if (!containers || containers.length === 0) {
    return {};
  }
  return containers[0].resources ?? {};
};

const ResourceDisplay: React.FC<{
  resources: RayContainerResources;
  testIdPrefix: string;
}> = ({ resources, testIdPrefix }) => (
  <>
    <DescriptionListGroup>
      <DescriptionListTerm style={{ fontWeight: 'normal' }}>CPU requests</DescriptionListTerm>
      <DescriptionListDescription data-testid={`${testIdPrefix}-cpu-requests`}>
        {resources.requests?.cpu ?? '-'}
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm style={{ fontWeight: 'normal' }}>CPU limits</DescriptionListTerm>
      <DescriptionListDescription data-testid={`${testIdPrefix}-cpu-limits`}>
        {resources.limits?.cpu ?? '-'}
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm style={{ fontWeight: 'normal' }}>Memory requests</DescriptionListTerm>
      <DescriptionListDescription data-testid={`${testIdPrefix}-memory-requests`}>
        {resources.requests?.memory ?? '-'}
      </DescriptionListDescription>
    </DescriptionListGroup>
    <DescriptionListGroup>
      <DescriptionListTerm style={{ fontWeight: 'normal' }}>Memory limits</DescriptionListTerm>
      <DescriptionListDescription data-testid={`${testIdPrefix}-memory-limits`}>
        {resources.limits?.memory ?? '-'}
      </DescriptionListDescription>
    </DescriptionListGroup>
  </>
);

const RayJobResourcesTab: React.FC<RayJobResourcesTabProps> = ({
  job,
  nodeCount,
  canScaleNodes = false,
  onScaleNodes,
}) => {
  const { project, projects } = useModelTrainingContext();
  const { clusterSpec, loaded: clusterSpecLoaded } = useRayClusterSpec(job);
  const workerGroupSpecs = clusterSpec?.workerGroupSpecs;
  const numOfHosts = workerGroupSpecs?.[0]?.numOfHosts ?? 1;

  const jobProject = project ?? projects?.find((p) => p.metadata.name === job.metadata.namespace);
  const isProjectKueueEnabled = jobProject?.metadata.labels?.[KUEUE_MANAGED_LABEL] === 'true';

  const {
    clusterQueueName,
    loaded: clusterQueueLoaded,
    error,
  } = useClusterQueueFromLocalQueue(
    isProjectKueueEnabled ? job.metadata.labels?.[KUEUE_QUEUE_LABEL] : undefined,
    isProjectKueueEnabled ? job.metadata.namespace : undefined,
  );

  const { clusterQueue, loaded: clusterQueueDataLoaded } = useClusterQueue(clusterQueueName);

  const quotaSource = clusterQueue?.spec.cohort || '-';
  const consumedResources = clusterQueue ? getAllConsumedResources(clusterQueue) : [];

  return (
    <Stack hasGutter>
      <StackItem className="pf-v6-u-mt-md">
        <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '20ch' }}>
          <Title headingLevel="h3" size="md" data-testid="node-configurations-section">
            Node configurations
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Nodes</DescriptionListTerm>
            <DescriptionListDescription data-testid="nodes-value">
            {canScaleNodes ? (
                <Button
                  variant="link"
                  isInline
                  icon={<PencilAltIcon />}
                  iconPosition="end"
                  onClick={onScaleNodes}
                  data-testid="nodes-edit-button"
                >
                  {nodeCount || '-'}
                </Button>
              ) : (
                nodeCount || '-'
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Processes per node
            </DescriptionListTerm>
            {clusterSpecLoaded ? (
              <DescriptionListDescription data-testid="processes-per-node-value">
                {numOfHosts}
              </DescriptionListDescription>
            ) : (
              <Skeleton width="80px" />
            )}
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>

      <StackItem className="pf-v6-u-mt-md">
        <Title headingLevel="h3" size="md" data-testid="resources-per-node-section">
          Resources per node
        </Title>
        {!clusterSpecLoaded ? (
          <Skeleton height="100px" className="pf-v6-u-mt-sm" />
        ) : workerGroupSpecs && workerGroupSpecs.length > 0 ? (
          workerGroupSpecs.map((group) => (
            <StackItem key={group.groupName} className="pf-v6-u-mt-md">
              <Content
                component={ContentVariants.p}
                style={{ fontWeight: 600 }}
                data-testid={`worker-group-${group.groupName}-title`}
              >
                {group.groupName}
              </Content>
              <DescriptionList isHorizontal className="pf-v6-u-pl-md">
                <ResourceDisplay
                  resources={getWorkerResources(group)}
                  testIdPrefix={`worker-group-${group.groupName}`}
                />
              </DescriptionList>
            </StackItem>
          ))
        ) : (
          <Content component={ContentVariants.p} className="pf-v6-u-mt-sm">
            No worker groups configured.
          </Content>
        )}
      </StackItem>

      <StackItem className="pf-v6-u-mt-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h3" size="md" data-testid="cluster-queue-section">
            Cluster queue
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Queue</DescriptionListTerm>
            {clusterQueueLoaded ? (
              <DescriptionListDescription data-testid="queue-value">
                {clusterQueueName || '-'}
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
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Quota source</DescriptionListTerm>
            {clusterQueueDataLoaded ? (
              <DescriptionListDescription data-testid="quota-source-value">
                {error ? '-' : quotaSource}
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

export default RayJobResourcesTab;
