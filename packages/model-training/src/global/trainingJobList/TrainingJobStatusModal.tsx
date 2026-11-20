import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Content,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Panel,
  PanelMain,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  TreeView,
  TreeViewDataItem,
  Icon,
  Button,
  Skeleton,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

import { getKueueStatusInfo } from '@odh-dashboard/ui-core/kueue/statusInfo';
import { getKueueWorkloadStatusWithMessage } from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import {
  KueueWorkloadStatus,
  KUEUE_STATUSES_OVERRIDE_WORKBENCH,
} from '@odh-dashboard/k8s-core/kueue/types';
import {
  getHumanReadableKueueMessage,
  getRequeuedMessage,
} from '@odh-dashboard/k8s-core/kueue/messageUtils';
import {
  t_global_text_color_regular as RegularColor,
  t_global_text_color_status_danger_default as DangerColor,
  t_color_gray_60 as Gray60,
  t_global_text_color_disabled as DisabledColor,
} from '@patternfly/react-tokens';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import EventLog from '@odh-dashboard/internal/concepts/k8s/EventLog/EventLog';
import TrainingJobStatus from './components/TrainingJobStatus';
import {
  getTrainingJobStatusSync,
  getStatusInfo,
  getStatusFlags,
  getStatusAlert,
  getTrainJobPodBlockers,
  getSectionStatusesFromJobsStatus,
  getSectionExistence,
  JobSectionName,
} from './utils';
import { useWorkloadForTrainJob } from './hooks/useWorkloadForTrainJob';
import { useWatchTrainJobEvents } from '../../api/events';
import { TrainJobKind } from '../../k8sTypes';
import { JobDisplayState, TrainingJobState } from '../../types';
import useTrainJobPods from '../../hooks/useTrainJobPods';

type TrainingJobStatusModalProps = {
  job: TrainJobKind;
  jobStatus?: JobDisplayState;
  onClose?: () => void;
  onDelete?: () => void;
  onPauseClick?: () => void;
  onResumeClick?: () => void;
  isToggling?: boolean;
};

const PROGRESS_TAB = 'Progress';
const EVENT_LOG_TAB = 'Event log';

const getStatusIcon = (sectionStatus: TrainingJobState) => {
  if (sectionStatus === TrainingJobState.UNKNOWN) {
    return null;
  }

  const { IconComponent, status: iconStatus } = getStatusInfo(sectionStatus);
  if (iconStatus) {
    return (
      <Icon status={iconStatus}>
        <IconComponent />
      </Icon>
    );
  }
  return <IconComponent />;
};

const TrainingJobStatusModal: React.FC<TrainingJobStatusModalProps> = ({
  job,
  jobStatus,
  onClose,
  onDelete,
  onPauseClick,
  onResumeClick,
  isToggling = false,
}) => {
  const status = jobStatus || getTrainingJobStatusSync(job);
  const displayName = getDisplayNameFromK8sResource(job);
  const [workloads, workloadLoaded, workloadError] = useWorkloadForTrainJob(job);
  const { training, loaded: podsLoaded, error: podsError } = useTrainJobPods(job);
  const workload = React.useMemo(() => {
    if (!workloadLoaded || workloads.length === 0) return null;
    return workloads[0];
  }, [workloads, workloadLoaded]);
  const workloadConditions = React.useMemo(
    () => workload?.status?.conditions ?? [],
    [workload?.status?.conditions],
  );

  const [events, eventsLoaded] = useWatchTrainJobEvents(
    job.metadata.namespace,
    job.metadata.name,
    workload?.metadata?.name,
  );

  const sectionStatuses = React.useMemo(() => {
    return getSectionStatusesFromJobsStatus(job.status?.jobsStatus, status);
  }, [status, job.status?.jobsStatus]);

  const sectionExistence = React.useMemo(() => {
    return getSectionExistence(job.status?.jobsStatus);
  }, [job.status?.jobsStatus]);

  const statusFlags = React.useMemo(() => getStatusFlags(status), [status]);
  const { isFailed, isPaused, inProgress, isComplete, isInadmissible } = statusFlags;
  const [activeTab, setActiveTab] = React.useState<string>(PROGRESS_TAB);
  const podBlockers =
    podsLoaded &&
    !podsError &&
    !isPaused &&
    !isComplete &&
    !isFailed &&
    status !== TrainingJobState.DELETING
      ? getTrainJobPodBlockers(training)
      : [];

  // Close status modal and trigger pause action
  const handlePauseClick = React.useCallback(() => {
    onClose?.();
    onPauseClick?.();
  }, [onClose, onPauseClick]);

  const statusMessage = React.useMemo(
    () => getStatusAlert(status, workloadConditions, job.status?.conditions, events),
    [status, workloadConditions, job.status?.conditions, events],
  );

  const renderQueueDetails = () => {
    if (
      !workload ||
      workloadError ||
      isComplete ||
      isFailed ||
      status === TrainingJobState.DELETING
    ) {
      return null;
    }
    const kueueStatus = getKueueWorkloadStatusWithMessage({
      ...workload,
      status: {
        ...workload.status,
        conditions: workloadConditions.filter(
          (condition) =>
            condition.observedGeneration === undefined ||
            workload.metadata?.generation === undefined ||
            condition.observedGeneration >= workload.metadata.generation,
        ),
      },
    });
    if (
      kueueStatus.status === KueueWorkloadStatus.Complete ||
      !KUEUE_STATUSES_OVERRIDE_WORKBENCH.includes(kueueStatus.status) ||
      !kueueStatus.message
    ) {
      return null;
    }
    const info = getKueueStatusInfo(kueueStatus.status);
    const message =
      kueueStatus.status === KueueWorkloadStatus.Requeued
        ? getRequeuedMessage({ ...kueueStatus, queueName: workload.spec.queueName })
        : getHumanReadableKueueMessage(
            kueueStatus.status,
            kueueStatus.message,
            workload.spec.queueName,
          );
    return (
      <Content
        component="p"
        className="pf-v6-u-text-break-word"
        style={{ color: info.status === 'danger' ? DangerColor.var : RegularColor.var }}
        aria-live="polite"
        data-testid="training-job-status-summary"
      >
        <Flex
          component="span"
          gap={{ default: 'gapSm' }}
          flexWrap={{ default: 'nowrap' }}
          alignItems={{ default: 'alignItemsBaseline' }}
        >
          <FlexItem component="span" flex={{ default: 'flexNone' }}>
            <Icon isInline status={info.status}>
              <info.IconComponent className={info.iconClassName} />
            </Icon>
          </FlexItem>
          <FlexItem component="span">{message}</FlexItem>
        </Flex>
      </Content>
    );
  };

  const renderFailureMessage = () => {
    if (!isFailed || !statusMessage) {
      return null;
    }
    const isLoading = !workloadLoaded || !eventsLoaded;

    return (
      <StackItem>
        <Alert
          isInline
          variant={AlertVariant.danger}
          title={isLoading ? <Skeleton height="20px" width="60%" /> : statusMessage.title}
          data-testid={`${statusMessage.variant}-${statusMessage.title}`}
        >
          {isLoading ? (
            <Skeleton height="20px" width="80%" />
          ) : (
            <Content>{statusMessage.description}</Content>
          )}
        </Alert>
      </StackItem>
    );
  };

  const renderStatus = () => {
    if (isFailed) {
      return renderFailureMessage();
    }

    return null;
  };

  const renderLogs = () => {
    return (
      <Panel isScrollable>
        <PanelMain>
          {!Array.isArray(events) || events.length === 0 ? (
            <Content style={{ color: DisabledColor.var }}>There are no recent events.</Content>
          ) : (
            <EventLog events={events} dataTestId="event-logs" />
          )}
        </PanelMain>
      </Panel>
    );
  };

  const treeData: TreeViewDataItem[] = React.useMemo(() => {
    const treeItems: TreeViewDataItem[] = [];

    if (sectionExistence.hasDataInitializer || sectionExistence.hasModelInitializer) {
      const initializationChildren: TreeViewDataItem[] = [];

      if (sectionExistence.hasDataInitializer) {
        initializationChildren.push({
          id: JobSectionName.DataInitializer,
          name: (
            <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>{getStatusIcon(sectionStatuses.dataInitializer)}</FlexItem>
              <FlexItem data-testid="data-initializer-section">Initializing data</FlexItem>
            </Flex>
          ),
        });
      }

      if (sectionExistence.hasModelInitializer) {
        initializationChildren.push({
          id: JobSectionName.ModelInitializer,
          name: (
            <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>{getStatusIcon(sectionStatuses.modelInitializer)}</FlexItem>
              <FlexItem data-testid="model-initializer-section">Initializing model</FlexItem>
            </Flex>
          ),
        });
      }

      treeItems.push({
        id: 'initialization',
        name: (
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{getStatusIcon(sectionStatuses.initialization)}</FlexItem>
            <FlexItem data-testid="initialization-section">Initialization</FlexItem>
          </Flex>
        ),
        children: initializationChildren,
        defaultExpanded: true,
      });
    }

    if (sectionExistence.hasTraining) {
      treeItems.push({
        id: 'training',
        name: (
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{getStatusIcon(sectionStatuses.training)}</FlexItem>
            <FlexItem data-testid="training-section">Training</FlexItem>
          </Flex>
        ),
        defaultExpanded: true,
      });
    }

    return treeItems;
  }, [sectionStatuses, sectionExistence]);

  const renderProgress = () => {
    if (treeData.length === 0) {
      return (
        <Flex
          direction={{ default: 'column' }}
          gap={{ default: 'gapMd' }}
          style={{ height: '100%' }}
        >
          <FlexItem flex={{ default: 'flex_1' }} style={{ overflowY: 'scroll', minHeight: 0 }}>
            <Content style={{ color: DisabledColor.var }}>
              No progress information available for this job.
            </Content>
          </FlexItem>
        </Flex>
      );
    }

    return (
      <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }} style={{ height: '100%' }}>
        <FlexItem flex={{ default: 'flex_1' }} style={{ overflowY: 'scroll', minHeight: 0 }}>
          <TreeView data={treeData} hasGuides />
        </FlexItem>
      </Flex>
    );
  };

  const queueDetails = renderQueueDetails();

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen
      onClose={onClose}
      data-testid="training-job-status-modal"
    >
      <ModalHeader
        data-testid="training-job-status-modal-header"
        description={
          queueDetails || podBlockers.length > 0 ? (
            <Content
              component="p"
              data-testid="training-job-status-modal-description"
              style={{ color: Gray60.value }}
            >
              Job status
            </Content>
          ) : undefined
        }
        title={
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{displayName} status</FlexItem>
            <TrainingJobStatus job={job} jobStatus={status} showProgressBar={false} />
          </Flex>
        }
      />
      <ModalBody
        style={{ height: '400px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <Stack hasGutter style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {queueDetails || podBlockers.length > 0 ? (
            <StackItem style={{ maxHeight: '50%', overflowY: 'auto', flexShrink: 0 }}>
              <Stack hasGutter>
                {queueDetails}
                {podBlockers.map((message) => (
                  <StackItem key={message}>
                    <Content
                      component="p"
                      className="pf-v6-u-text-break-word"
                      style={{ color: DangerColor.var }}
                      aria-live="polite"
                      data-testid="training-job-pod-summary"
                    >
                      <Flex
                        component="span"
                        gap={{ default: 'gapSm' }}
                        flexWrap={{ default: 'nowrap' }}
                        alignItems={{ default: 'alignItemsBaseline' }}
                      >
                        <FlexItem component="span" flex={{ default: 'flexNone' }}>
                          <Icon isInline status="danger">
                            <ExclamationCircleIcon />
                          </Icon>
                        </FlexItem>
                        <FlexItem component="span">{message}</FlexItem>
                      </Flex>
                    </Content>
                  </StackItem>
                ))}
              </Stack>
            </StackItem>
          ) : null}
          {renderStatus()}
          <StackItem>
            <Tabs
              activeKey={activeTab}
              onSelect={(_ev, tabIndex) => setActiveTab(`${tabIndex}`)}
              aria-label="status details"
            >
              <Tab
                eventKey={PROGRESS_TAB}
                aria-label={PROGRESS_TAB}
                title={<TabTitleText>{PROGRESS_TAB}</TabTitleText>}
                data-testid="expand-progress"
              />
              <Tab
                eventKey={EVENT_LOG_TAB}
                aria-label={EVENT_LOG_TAB}
                title={<TabTitleText>{EVENT_LOG_TAB}</TabTitleText>}
                data-testid="expand-logs"
              />
            </Tabs>
          </StackItem>
          <StackItem isFilled style={{ minHeight: 0, overflowY: 'auto' }}>
            {activeTab === PROGRESS_TAB ? renderProgress() : renderLogs()}
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        {(inProgress || isPaused) && !isComplete && !isInadmissible ? (
          <Button
            variant="primary"
            onClick={isPaused ? onResumeClick : handlePauseClick}
            isDisabled={isToggling}
            isLoading={isToggling}
            data-testid={isPaused ? 'resume-job-button' : 'pause-job-button'}
          >
            {isPaused ? 'Resume job' : 'Pause job'}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => {
            onDelete?.();
          }}
          isDisabled={isToggling}
          data-testid="delete-job-button"
        >
          Delete job
        </Button>
        <Button variant="link" onClick={onClose} data-testid="close-status-modal-button">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default TrainingJobStatusModal;
