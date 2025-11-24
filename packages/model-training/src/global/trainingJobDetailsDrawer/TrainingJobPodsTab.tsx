import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  List,
  ListItem,
  Skeleton,
  Stack,
  StackItem,
  Timestamp,
  TimestampTooltipVariant,
  Icon,
  Title,
  ExpandableSection,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  InProgressIcon,
  ExclamationCircleIcon,
  PendingIcon,
} from '@patternfly/react-icons';
import { PodKind } from '@odh-dashboard/internal/k8sTypes';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import {
  t_global_color_brand_default as BrandDefaultColor,
  t_global_text_color_regular as RegularColor,
  t_global_text_color_200 as TextColor200,
} from '@patternfly/react-tokens';
import { TrainJobKind } from '../../k8sTypes';
import useTrainJobPods from '../../hooks/useTrainJobPods';

type TrainingJobPodsTabProps = {
  job: TrainJobKind;
  onPodClick?: (podName: string) => void;
};

const getPodStatusIcon = (pod: PodKind) => {
  const phase = pod.status?.phase ? pod.status.phase.toLowerCase() : '';
  const containerStatuses = pod.status?.containerStatuses || [];

  // Check if any container is waiting
  const hasWaiting = containerStatuses.some((cs) => cs.state?.waiting);

  switch (phase) {
    case 'succeeded':
      return (
        <Icon status="success">
          <CheckCircleIcon />
        </Icon>
      );
    case 'failed':
      return (
        <Icon status="danger">
          <ExclamationCircleIcon />
        </Icon>
      );
    case 'running':
      return (
        <Icon>
          <InProgressIcon color={BrandDefaultColor.var} />
        </Icon>
      );
    case 'pending':
      return (
        <Icon status="info">
          <PendingIcon />
        </Icon>
      );
    default:
      // Handle waiting containers or unknown phases
      if (hasWaiting) {
        return (
          <Icon status="info">
            <PendingIcon />
          </Icon>
        );
      }
      return (
        <Icon status="info">
          <InProgressIcon />
        </Icon>
      );
  }
};

const PodListItem: React.FC<{ pod: PodKind; onPodClick?: (podName: string) => void }> = ({
  pod,
  onPodClick,
}) => {
  const podName = pod.metadata.name;
  const created = pod.metadata.creationTimestamp;

  return (
    <ListItem>
      <Flex direction={{ default: 'column' }}>
        <FlexItem>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsMd' }}
          >
            <FlexItem>{getPodStatusIcon(pod)}</FlexItem>
            <FlexItem flex={{ default: 'flex_1' }}>
              <Button
                variant="link"
                isInline
                style={{ padding: 0, fontSize: 'inherit' }}
                onClick={() => onPodClick?.(podName)}
              >
                {podName}
              </Button>
            </FlexItem>
          </Flex>
        </FlexItem>
        <FlexItem>
          {created ? (
            <Timestamp
              date={new Date(created)}
              tooltip={{
                variant: TimestampTooltipVariant.default,
              }}
            >
              Created: {relativeTime(Date.now(), new Date(created).getTime())}
            </Timestamp>
          ) : (
            'Unknown'
          )}
        </FlexItem>
      </Flex>
    </ListItem>
  );
};

const InitializersSection: React.FC<{
  pods: PodKind[];
  loaded?: boolean;
  onPodClick?: (podName: string) => void;
}> = ({ pods, loaded = true, onPodClick }) => {
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);

  return (
    <ExpandableSection
      toggleContent={
        <Title headingLevel="h3" size="md" style={{ color: RegularColor.var }}>
          Initializers
        </Title>
      }
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    >
      {!loaded ? (
        <Skeleton height="50px" />
      ) : pods.length === 0 ? (
        <div style={{ color: TextColor200.var }}>No initializers found</div>
      ) : (
        <List isPlain>
          {pods.map((pod) => (
            <PodListItem
              key={pod.metadata.uid || pod.metadata.name}
              pod={pod}
              onPodClick={onPodClick}
            />
          ))}
        </List>
      )}
    </ExpandableSection>
  );
};

const TrainingPodsSection: React.FC<{
  pods: PodKind[];
  loaded?: boolean;
  onPodClick?: (podName: string) => void;
}> = ({ pods, loaded = true, onPodClick }) => {
  return (
    <Stack>
      <StackItem className="pf-v6-u-mb-md">
        <Title headingLevel="h3" size="md">
          Training pods
        </Title>
      </StackItem>
      <StackItem>
        {!loaded ? (
          <Skeleton height="50px" />
        ) : pods.length > 0 ? (
          <List isPlain>
            {pods.map((pod) => (
              <PodListItem
                key={pod.metadata.uid || pod.metadata.name}
                pod={pod}
                onPodClick={onPodClick}
              />
            ))}
          </List>
        ) : (
          <div style={{ color: TextColor200.var }}>No pods found</div>
        )}
      </StackItem>
    </Stack>
  );
};

const TrainingJobPodsTab: React.FC<TrainingJobPodsTabProps> = ({ job, onPodClick }) => {
  const { initializers, training, loaded } = useTrainJobPods(job);

  return (
    <Stack hasGutter className="pf-v6-u-mt-md">
      <StackItem>
        <InitializersSection pods={initializers} loaded={loaded} onPodClick={onPodClick} />
      </StackItem>
      <StackItem className="pf-v6-u-mt-md">
        <TrainingPodsSection pods={training} loaded={loaded} onPodClick={onPodClick} />
      </StackItem>
    </Stack>
  );
};

export default TrainingJobPodsTab;
