import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Panel,
  PanelMain,
  ProgressStep,
  ProgressStepper,
  ProgressStepVariant,
  Skeleton,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import {
  t_global_icon_color_brand_default as BrandIconColor,
  t_global_icon_size_font_md as InfoIconSize,
  t_global_spacer_xs as ExtraSmallSpacerSize,
  t_global_text_color_regular as RegularColor,
  t_global_text_color_disabled as DisabledColor,
  t_global_text_color_status_danger_default as DangerColor,
  t_global_text_color_status_info_default as InfoColor,
  t_global_text_color_status_warning_default as WarningColor,
} from '@patternfly/react-tokens';
import { InfoCircleIcon, InProgressIcon } from '@patternfly/react-icons';
import { EventStatus, NotebookStatus, ProgressionStepTitles } from '#~/types';
import { EventKind, NotebookKind } from '#~/k8sTypes';
import { useNotebookProgress } from '#~/utilities/notebookControllerUtils';
import useClusterQueue from '#~/utilities/useClusterQueue';
import useAssignedFlavor from '#~/utilities/useAssignedFlavor';
import { getAllConsumedResources } from '#~/utilities/clusterQueueUtils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { getClusterQueueNameFromLocalQueues } from '#~/pages/hardwareProfiles/utils';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import {
  KUEUE_STATUSES_OVERRIDE_WORKBENCH,
  type KueueWorkloadStatusWithMessage,
} from '#~/concepts/kueue/types';
import EventLog from '#~/concepts/k8s/EventLog/EventLog';
import NotebookStatusLabel from './NotebookStatusLabel';
import './StartNotebookModal.scss';

const KUEUE_QUEUE_LABEL = 'kueue.x-k8s.io/queue-name';
const PROGRESS_TAB = 'Progress';
const EVENT_LOG_TAB = 'Events log';
const RESOURCES_TAB = 'Resources';

const progressVariants = {
  [EventStatus.PENDING]: ProgressStepVariant.pending,
  [EventStatus.IN_PROGRESS]: ProgressStepVariant.pending,
  [EventStatus.ERROR]: ProgressStepVariant.danger,
  [EventStatus.INFO]: ProgressStepVariant.info,
  [EventStatus.WARNING]: ProgressStepVariant.warning,
  [EventStatus.SUCCESS]: ProgressStepVariant.success,
};

type StartNotebookModalProps = {
  notebook?: NotebookKind;
  isStarting: boolean;
  isRunning: boolean;
  isStopping: boolean;
  notebookStatus: NotebookStatus | null;
  events: EventKind[];
  kueueStatus?: KueueWorkloadStatusWithMessage | null;
  onClose?: () => void;
  buttons: React.ReactNode;
};

type SpawnStatus = {
  status: AlertVariant;
  title: string;
  description: React.ReactNode;
};

const StartNotebookModal: React.FC<StartNotebookModalProps> = ({
  notebookStatus,
  events,
  notebook = null,
  isStarting,
  isRunning,
  isStopping,
  kueueStatus: kueueStatusProp,
  onClose,
  buttons,
}) => {
  const [spawnStatus, setSpawnStatus] = React.useState<SpawnStatus | null>(null);
  const isError = notebookStatus?.currentStatus === EventStatus.ERROR;
  const isStopped = !isError && !isRunning && !isStarting && !isStopping;
  const notebookProgress = useNotebookProgress(notebook, isRunning, isStopping, isStopped, events);
  const inProgress = !isStopped && (isStarting || isStopping || !isRunning);
  const { currentProject: project, localQueues } = React.useContext(ProjectDetailsContext);
  const { isProjectKueueEnabled, isKueueFeatureEnabled } = useKueueConfiguration(project);
  const showResourcesTab = Boolean(isKueueFeatureEnabled && isProjectKueueEnabled);
  const kueueStatus = kueueStatusProp;
  const [activeTab, setActiveTab] = React.useState<string>(PROGRESS_TAB);

  React.useEffect(() => {
    if (!showResourcesTab && activeTab === RESOURCES_TAB) {
      setActiveTab(PROGRESS_TAB);
    }
  }, [showResourcesTab, activeTab]);
  const localQueueName = notebook?.metadata.labels?.[KUEUE_QUEUE_LABEL];
  const clusterQueueName = getClusterQueueNameFromLocalQueues(localQueueName, localQueues);
  const shouldShowResources = Boolean(isProjectKueueEnabled && localQueueName && clusterQueueName);
  const {
    clusterQueue,
    loaded: clusterQueueLoaded,
    error: clusterQueueError,
  } = useClusterQueue(shouldShowResources ? clusterQueueName : undefined);
  const workloadNamespace =
    shouldShowResources && project.metadata.name ? project.metadata.name : undefined;
  const assignedFlavorName = useAssignedFlavor(
    workloadNamespace,
    localQueueName ?? undefined,
    notebook != null ? notebook.metadata.name : undefined,
  );
  const quotaSource = clusterQueue?.spec.cohort ?? '-';
  const consumedResources = clusterQueue
    ? getAllConsumedResources(clusterQueue, assignedFlavorName)
    : [];
  const hasClusterQueueError = Boolean(clusterQueueError);

  React.useEffect(() => {
    if (isStarting && !isRunning) {
      if (!notebookStatus) {
        return;
      }
      if (notebookStatus.currentStatus === EventStatus.IN_PROGRESS) {
        setSpawnStatus(null);
        return;
      }

      setSpawnStatus({
        status:
          notebookStatus.currentStatus === EventStatus.ERROR
            ? AlertVariant.danger
            : notebookStatus.currentStatus === EventStatus.INFO ||
              notebookStatus.currentStatus === EventStatus.SUCCESS
            ? AlertVariant.info
            : AlertVariant.warning,
        title: notebookStatus.currentEventReason,
        description: notebookStatus.currentEventDescription,
      });
    }
  }, [isRunning, isStarting, notebookStatus]);

  const renderLastUpdate = () => {
    const showKueueMessage =
      kueueStatus?.status && KUEUE_STATUSES_OVERRIDE_WORKBENCH.includes(kueueStatus.status);
    const showKueueStatusWhenStopped = isStopped && showKueueMessage;
    if (
      isRunning ||
      (isStopped && !showKueueMessage) ||
      (spawnStatus?.status !== AlertVariant.danger && !inProgress && !showKueueStatusWhenStopped)
    ) {
      return null;
    }

    let color: string;
    switch (spawnStatus?.status) {
      case AlertVariant.danger:
        color = DangerColor.var;
        break;
      case AlertVariant.warning:
        color = WarningColor.var;
        break;
      default:
        color = RegularColor.var;
    }

    const kueueTitle = showKueueMessage ? kueueStatus.message?.trim() || kueueStatus.status : null;
    const workbenchTitle =
      notebookStatus?.currentEvent ||
      (isStarting
        ? 'Waiting for server request to start...'
        : isStopping
        ? 'Shutting down the server...'
        : 'Creating resources...');
    const title = kueueTitle ?? workbenchTitle;

    return (
      <StackItem>
        <Flex gap={{ default: 'gapSm' }}>
          {(!spawnStatus || spawnStatus.status === AlertVariant.info) && inProgress ? (
            <FlexItem>
              <InProgressIcon style={{ color: BrandIconColor.var }} className="odh-u-spin" />
            </FlexItem>
          ) : null}
          <FlexItem>
            <Content style={{ color }} data-testid="notebook-latest-status">
              {title}
            </Content>
          </FlexItem>
        </Flex>
      </StackItem>
    );
  };

  const renderStatus = () => {
    if (isStopped) {
      return null;
    }

    if (spawnStatus?.status === AlertVariant.danger) {
      return (
        <StackItem>
          <Alert
            isInline
            variant={spawnStatus.status}
            title={spawnStatus.title}
            data-testid={`${spawnStatus.status}-${spawnStatus.title}`}
          >
            <p>{spawnStatus.description}</p>
          </Alert>
        </StackItem>
      );
    }

    if (!spawnStatus && inProgress) {
      return (
        <StackItem>
          <Content>
            Depending on the size and resources requested, this can take several minutes.
          </Content>
        </StackItem>
      );
    }

    return null;
  };

  const renderLogs = () => (
    <Panel isScrollable>
      <PanelMain>
        {(isStopped || isRunning) && events.length === 0 ? (
          <span style={{ color: DisabledColor.var }}>There are no recent events.</span>
        ) : (
          <EventLog events={events} initialMessage="Server requested" dataTestId="event-logs" />
        )}
      </PanelMain>
    </Panel>
  );

  const renderResources = () => {
    if (!isProjectKueueEnabled || !localQueueName || !clusterQueueName) {
      return (
        <Content data-testid="resources-no-queue">
          No cluster queue information for this workbench.
        </Content>
      );
    }

    if (!clusterQueueLoaded && !hasClusterQueueError) {
      return (
        <Stack hasGutter>
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
      <Stack hasGutter={false}>
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
                {clusterQueueName}
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
                    {hasClusterQueueError ? '-' : quotaSource}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </StackItem>
            {hasClusterQueueError ? (
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

  const renderProgress = () => (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }} style={{ height: '100%' }}>
      <FlexItem>
        <Flex gap={{ default: 'gapSm' }} flexWrap={{ default: 'nowrap' }}>
          <FlexItem>
            <InfoCircleIcon
              style={{
                color: InfoColor.var,
                fontSize: InfoIconSize.var,
                paddingTop: ExtraSmallSpacerSize.var,
              }}
            />
          </FlexItem>
          <FlexItem>
            Steps may repeat or occur in any order, depending on the workbench&apos;s priority in
            the queue and current resource availability.
          </FlexItem>
        </Flex>
      </FlexItem>
      <FlexItem flex={{ default: 'flex_1' }} style={{ overflowY: 'scroll', minHeight: 0 }}>
        <ProgressStepper isVertical data-testid="notebook-startup-steps">
          {notebookProgress.map((progressStep, i) => (
            <ProgressStep
              key={`${progressStep.timestamp}-${i}`}
              variant={progressVariants[progressStep.status]}
              aria-label={progressStep.status}
              id={`${progressStep.timestamp}`}
              titleId={`${progressStep.timestamp}-title`}
              data-testid={`step-status-${progressStep.status}`}
            >
              {ProgressionStepTitles[progressStep.step]}
            </ProgressStep>
          ))}
        </ProgressStepper>
      </FlexItem>
    </Flex>
  );

  const renderActiveTabContent = (): React.ReactNode => {
    switch (activeTab) {
      case PROGRESS_TAB:
        return renderProgress();
      case EVENT_LOG_TAB:
        return renderLogs();
      case RESOURCES_TAB:
        return renderResources();
      default:
        return renderProgress();
    }
  };

  return (
    <Modal
      appendTo={document.body}
      variant={ModalVariant.small}
      isOpen
      onClose={onClose}
      data-testid="notebook-status-modal"
    >
      <ModalHeader
        data-testid="notebook-status-modal-header"
        title={
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>Workbench status</FlexItem>
            <FlexItem>
              <NotebookStatusLabel
                isStarting={isStarting && !isRunning}
                isStopping={isStopping}
                isRunning={isRunning}
                notebookStatus={notebookStatus}
                kueueStatus={kueueStatus}
              />
            </FlexItem>
          </Flex>
        }
      />
      <ModalBody className="start-notebook-modal__content-height">
        <Stack hasGutter style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {renderLastUpdate()}
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
              {showResourcesTab && (
                <Tab
                  eventKey={RESOURCES_TAB}
                  aria-label={RESOURCES_TAB}
                  title={<TabTitleText>{RESOURCES_TAB}</TabTitleText>}
                  data-testid="expand-resources"
                />
              )}
            </Tabs>
          </StackItem>
          <StackItem isFilled className="start-notebook-modal__filled-stack-item">
            {renderActiveTabContent()}
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>{buttons}</ModalFooter>
    </Modal>
  );
};

export default StartNotebookModal;
