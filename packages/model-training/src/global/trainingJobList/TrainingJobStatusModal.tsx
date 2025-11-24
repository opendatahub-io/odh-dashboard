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
  Title,
  Icon,
  Button,
  Skeleton,
} from '@patternfly/react-core';

import { t_global_text_color_disabled as DisabledColor } from '@patternfly/react-tokens';
import EventLog from '@odh-dashboard/internal/concepts/k8s/EventLog/EventLog';
import TrainingJobStatus from './components/TrainingJobStatus';
import {
  getTrainingJobStatusSync,
  getStatusInfo,
  getStatusFlags,
  getStatusAlert,
  getSectionStatusesFromJobsStatus,
  getSectionExistence,
  JobSectionName,
  handlePauseResume as handlePauseResumeUtil,
  handleRetry as handleRetryUtil,
} from './utils';
import { useWorkloadForTrainJob } from './hooks/useWorkloadForTrainJob';
import { usePauseTrainJob } from './hooks/usePauseTrainJob';
import { useRetryTrainJob } from './hooks/useRetryTrainJob';
import { useWatchTrainJobEvents } from '../../api/events';
import { TrainJobKind } from '../../k8sTypes';
import { TrainingJobState } from '../../types';

type TrainingJobStatusModalProps = {
  job: TrainJobKind;
  jobStatus?: TrainingJobState;
  onClose?: () => void;
  onPause?: () => void;
  onDelete?: () => void;
};

const PROGRESS_TAB = 'Progress';
const EVENT_LOG_TAB = 'Events log';

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
  onPause,
  onDelete,
}) => {
  const status = jobStatus || getTrainingJobStatusSync(job);
  const [workloads, workloadLoaded] = useWorkloadForTrainJob(job);
  const workload = React.useMemo(() => {
    if (!workloadLoaded || workloads.length === 0) return null;
    return workloads[0];
  }, [workloads, workloadLoaded]);
  const workloadConditions = workload?.status?.conditions || [];

  const [events, eventsLoaded] = useWatchTrainJobEvents(
    job.metadata.namespace,
    job.metadata.name,
    workload?.metadata?.name,
  );

  const { pauseJob, isPausing } = usePauseTrainJob(job);
  const { retryJob, isRetrying } = useRetryTrainJob(job);

  const sectionStatuses = React.useMemo(() => {
    return getSectionStatusesFromJobsStatus(job.status?.jobsStatus, status);
  }, [status, job.status?.jobsStatus]);

  const sectionExistence = React.useMemo(() => {
    return getSectionExistence(job.status?.jobsStatus);
  }, [job.status?.jobsStatus]);

  const statusFlags = React.useMemo(() => getStatusFlags(status), [status]);
  const { isFailed, isPaused, inProgress, isComplete, isInadmissible } = statusFlags;
  const [activeTab, setActiveTab] = React.useState<string>(PROGRESS_TAB);

  const handlePauseResume = React.useCallback(async () => {
    await handlePauseResumeUtil(job, isPaused, pauseJob, () => {
      onPause?.();
      onClose?.();
    });
  }, [job, isPaused, pauseJob, onPause, onClose]);

  const handleRetry = React.useCallback(async () => {
    await handleRetryUtil(retryJob, () => {
      onClose?.();
    });
  }, [retryJob, onClose]);

  const statusMessage = React.useMemo(
    () => getStatusAlert(status, workloadConditions, job.status?.conditions, events),
    [status, workloadConditions, job.status?.conditions, events],
  );

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

    if (!statusMessage && inProgress) {
      if (!eventsLoaded) {
        return (
          <StackItem>
            <Skeleton height="24px" width="60%" />
          </StackItem>
        );
      }
      return null;
    }

    if (statusMessage) {
      const isLoading = !workloadLoaded;

      return (
        <StackItem>
          <Alert
            isInline
            variant={statusMessage.variant}
            title={isLoading ? <Skeleton height="20px" width="60%" /> : statusMessage.title}
          >
            {isLoading ? (
              <Skeleton height="20px" width="80%" />
            ) : statusMessage.description ? (
              <Content>{statusMessage.description}</Content>
            ) : null}
          </Alert>
        </StackItem>
      );
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
              <FlexItem data-testid="data-initializer-section">Data Initializer</FlexItem>
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
              <FlexItem data-testid="model-initializer-section">Model Initializer</FlexItem>
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

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen
      onClose={onClose}
      data-testid="training-job-status-modal"
    >
      <ModalHeader
        data-testid="training-job-status-modal-header"
        title={
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <Title headingLevel="h2" size="lg">
              Training Job Status
            </Title>
            <TrainingJobStatus job={job} jobStatus={status} />
          </Flex>
        }
      />
      <ModalBody
        style={{ height: '400px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <Stack hasGutter style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        {isFailed ? (
          <Button
            variant="primary"
            onClick={handleRetry}
            isDisabled={isRetrying}
            isLoading={isRetrying}
            data-testid="retry-job-button"
          >
            Retry Job
          </Button>
        ) : (inProgress || isPaused) && !isComplete && !isInadmissible ? (
          <Button
            variant="primary"
            onClick={handlePauseResume}
            isDisabled={isPausing}
            isLoading={isPausing}
            data-testid="pause-resume-job-button"
          >
            {isPaused ? 'Resume Job' : 'Pause Job'}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => {
            onDelete?.();
          }}
          isDisabled={isPausing || isRetrying}
          data-testid="delete-job-button"
        >
          Delete Job
        </Button>
        <Button variant="link" onClick={onClose} data-testid="close-status-modal-button">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default TrainingJobStatusModal;
