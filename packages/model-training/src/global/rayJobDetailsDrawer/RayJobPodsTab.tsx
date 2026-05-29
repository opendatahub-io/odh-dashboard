import * as React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  Flex,
  FlexItem,
  Skeleton,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { RayJobKind } from '../../k8sTypes';
import useRayJobPods from '../../hooks/useRayJobPods';
import { getPodStatusIcon } from '../podUtils';
import { getRestartCount } from '../trainingJobDetailsDrawer/utils';

type RayJobPodsTabProps = {
  job: RayJobKind;
};

const PodStatusName: React.FC<{ pod: PodKind }> = ({ pod }) => (
  <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
    <FlexItem>{getPodStatusIcon(pod)}</FlexItem>
    <FlexItem data-testid={`pod-name-${pod.metadata.name}`}>{pod.metadata.name}</FlexItem>
  </Flex>
);

const HeadPodSection: React.FC<{ headPods: PodKind[] }> = ({ headPods }) => {
  if (headPods.length === 0) {
    return null;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <DescriptionList isCompact isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>Role</DescriptionListTerm>
            <DescriptionListDescription>Ray Head</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
      {headPods.map((pod) => (
        <StackItem key={pod.metadata.name}>
          <PodStatusName pod={pod} />
          <DescriptionList isCompact isHorizontal className="pf-v6-u-mt-sm">
            <DescriptionListGroup>
              <DescriptionListTerm style={{ fontWeight: 'normal' }}>Restarts</DescriptionListTerm>
              <DescriptionListDescription>{getRestartCount(pod)}</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </StackItem>
      ))}
    </Stack>
  );
};

const WorkerGroupSection: React.FC<{ workerPods: PodKind[] }> = ({ workerPods }) => {
  const groupedWorkers = React.useMemo(() => {
    const groups = new Map<string, PodKind[]>();
    workerPods.forEach((pod) => {
      const groupName = pod.metadata.labels?.['ray.io/group'] ?? 'default';
      const existing = groups.get(groupName) ?? [];
      existing.push(pod);
      groups.set(groupName, existing);
    });
    return groups;
  }, [workerPods]);

  if (workerPods.length === 0) {
    return null;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <DescriptionList isCompact isHorizontal>
          <DescriptionListGroup>
            <DescriptionListTerm>Role</DescriptionListTerm>
            <DescriptionListDescription>Ray Worker</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
      {[...groupedWorkers.entries()].map(([groupName, pods]) => (
        <StackItem key={groupName} data-testid={`worker-group-${groupName}`}>
          <DescriptionList isCompact isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>Worker group</DescriptionListTerm>
              <DescriptionListDescription data-testid={`worker-group-name-${groupName}`}>
                {groupName}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
          <Stack className="pf-v6-u-pl-lg pf-v6-u-mt-sm">
            {pods.map((pod) => (
              <StackItem
                className="pf-v6-u-mt-sm"
                key={pod.metadata.name}
                data-testid={`worker-pod-${pod.metadata.name}`}
              >
                <PodStatusName pod={pod} />
              </StackItem>
            ))}
          </Stack>
        </StackItem>
      ))}
    </Stack>
  );
};

const RayJobPodsTab: React.FC<RayJobPodsTabProps> = ({ job }) => {
  const { submitterPods, headPods, workerPods, loaded, error } = useRayJobPods(job);
  const [isSubmitterExpanded, setIsSubmitterExpanded] = React.useState(true);

  if (error) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Failed to load pods"
        className="pf-v6-u-mt-md"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!loaded) {
    return (
      <Stack hasGutter className="pf-v6-u-mt-md">
        <StackItem>
          <Skeleton height="50px" />
        </StackItem>
        <StackItem>
          <Skeleton height="100px" />
        </StackItem>
      </Stack>
    );
  }

  return (
    <Stack hasGutter className="pf-v6-u-mt-md">
      {submitterPods.length > 0 && (
        <StackItem data-testid="submitter-pod-section">
          <ExpandableSection
            toggleContent={
              <Title headingLevel="h3" size="md">
                Submitter Pod
              </Title>
            }
            isExpanded={isSubmitterExpanded}
            onToggle={() => setIsSubmitterExpanded(!isSubmitterExpanded)}
          >
            {submitterPods.map((pod) => (
              <Stack key={pod.metadata.name}>
                <StackItem>
                  <PodStatusName pod={pod} />
                </StackItem>
                <DescriptionList isCompact isHorizontal className="pf-v6-u-pl-lg pf-v6-u-mt-sm">
                  <DescriptionListGroup>
                    <DescriptionListTerm>Role</DescriptionListTerm>
                    <DescriptionListDescription>Job Submitter</DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </Stack>
            ))}
          </ExpandableSection>
        </StackItem>
      )}

      <StackItem data-testid="ray-cluster-pods-section">
        <Title headingLevel="h3" size="md" className="pf-v6-u-mb-md">
          Ray Cluster Pods
        </Title>

        {headPods.length === 0 && workerPods.length === 0 ? (
          <EmptyState headingLevel="h4" icon={CubesIcon} titleText="No cluster pods">
            <EmptyStateBody>
              {job.status?.jobDeploymentStatus === 'Complete' ||
              job.status?.jobDeploymentStatus === 'Failed'
                ? 'The Ray cluster has been shut down.'
                : 'The Ray cluster has not started yet.'}
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <Stack hasGutter>
            <StackItem>
              <HeadPodSection headPods={headPods} />
            </StackItem>
            {workerPods.length > 0 && (
              <StackItem className="pf-v6-u-mt-lg">
                <WorkerGroupSection workerPods={workerPods} />
              </StackItem>
            )}
          </Stack>
        )}
      </StackItem>
    </Stack>
  );
};

export default RayJobPodsTab;
