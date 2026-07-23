/* eslint-disable @odh-dashboard/no-restricted-imports */
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
  HelperText,
  HelperTextItem,
  Icon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Panel,
  PanelMain,
  Skeleton,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Title,
  TreeView,
  type TreeViewDataItem,
} from '@patternfly/react-core';
import {
  t_global_icon_color_brand_default as BrandIconColor,
  t_global_text_color_regular as RegularColor,
  t_global_text_color_disabled as DisabledColor,
  t_global_text_color_status_danger_default as DangerColor,
  t_global_text_color_status_warning_default as WarningColor,
  t_global_color_nonstatus_purple_400 as PurpleColor,
  t_global_font_weight_body_bold as BoldWeight,
} from '@patternfly/react-tokens';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  InProgressIcon,
  OutlinedClockIcon,
} from '@patternfly/react-icons';
import type { PodContainerStatus } from '@odh-dashboard/k8s-core';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { EventStatus, NotebookStatus } from '#~/types';
import { EventKind, NotebookKind } from '#~/k8sTypes';
import { useNotebookProgress, getNotebookDisplayName } from '#~/utilities/notebookControllerUtils';
import useClusterQueue from '#~/utilities/useClusterQueue';
import useAssignedFlavor from '#~/utilities/useAssignedFlavor';
import { getAllConsumedResources } from '#~/utilities/clusterQueueUtils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { getClusterQueueNameFromLocalQueues } from '#~/pages/hardwareProfiles/utils';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import {
  KueueWorkloadStatus,
  KUEUE_STATUSES_OVERRIDE_WORKBENCH,
  type KueueWorkloadStatusWithMessage,
} from '#~/concepts/kueue/types';
import {
  getHumanReadableKueueMessage,
  getRequeuedMessage,
  formatQueuePosition,
} from '#~/concepts/kueue/messageUtils';
import { KUEUE_QUEUE_LABEL, getKueueStatusInfo } from '#~/concepts/kueue/index';
import EventLog from '#~/concepts/k8s/EventLog/EventLog';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import {
  fireWorkbenchProgressStepExpanded,
  fireWorkbenchStatusModalAction,
  getWorkbenchKueueTrackingProperties,
  WorkbenchTrackingEvent,
} from '#~/concepts/kueue/workbenchTracking';
import NotebookStatusLabel from './NotebookStatusLabel';
import './StartNotebookModal.scss';

const PROGRESS_TAB = 'Progress';
const EVENT_LOG_TAB = 'Events log';
const RESOURCES_TAB = 'Resources';

const stepIcons: Record<EventStatus, React.ReactNode> = {
  [EventStatus.SUCCESS]: (
    <Icon status="success">
      <CheckCircleIcon />
    </Icon>
  ),
  [EventStatus.ERROR]: (
    <Icon status="danger">
      <ExclamationCircleIcon />
    </Icon>
  ),
  [EventStatus.WARNING]: (
    <Icon status="warning">
      <ExclamationTriangleIcon />
    </Icon>
  ),
  [EventStatus.INFO]: (
    <Icon status="info">
      <InfoCircleIcon />
    </Icon>
  ),
  [EventStatus.IN_PROGRESS]: (
    <InProgressIcon style={{ color: BrandIconColor.var }} className="ai-u-spin" />
  ),
  [EventStatus.PENDING]: <OutlinedClockIcon />,
};

type StartNotebookModalButtonsContext = {
  activeTab: string;
};

type StartNotebookModalProps = {
  notebook?: NotebookKind;
  isStarting: boolean;
  isRunning: boolean;
  isStopping: boolean;
  notebookStatus: NotebookStatus | null;
  events: EventKind[];
  kueueStatus?: KueueWorkloadStatusWithMessage | null;
  containerStatuses?: PodContainerStatus[];
  onClose?: () => void;
  buttons: React.ReactNode | ((ctx: StartNotebookModalButtonsContext) => React.ReactNode);
  /** When true, fire Workbench Status Modal Action Clicked for close. */
  trackStatusModalActions?: boolean;
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
  kueueStatus,
  containerStatuses,
  onClose,
  buttons,
  trackStatusModalActions = false,
}) => {
  const [spawnStatus, setSpawnStatus] = React.useState<SpawnStatus | null>(null);
  const isError = notebookStatus?.currentStatus === EventStatus.ERROR;
  const isStopped = !isError && !isRunning && !isStarting && !isStopping;
  const notebookProgress = useNotebookProgress(
    notebook,
    isRunning,
    isStopping,
    isStopped,
    events,
    kueueStatus ?? null,
    containerStatuses,
  );

  // Server polling auto-expands IN_PROGRESS nodes; explicit user collapse is preserved.
  const [expandedNodeIds, setExpandedNodeIds] = React.useState<Set<string>>(
    () =>
      new Set(
        notebookProgress
          .filter((s) => s.isExpanded)
          .map((s) => `${s.stepKind}-${s.containerName ?? ''}`),
      ),
  );
  // Tracks nodes the user has explicitly collapsed so server polling won't re-expand them.
  const [userCollapsedIds, setUserCollapsedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setExpandedNodeIds((prev) => {
      const activeIds = notebookProgress
        .filter((s) => s.isExpanded)
        .map((s) => `${s.stepKind}-${s.containerName ?? ''}`)
        .filter((id) => !userCollapsedIds.has(id));
      if (activeIds.every((id) => prev.has(id))) {
        return prev;
      }
      const next = new Set(prev);
      activeIds.forEach((id) => next.add(id));
      return next;
    });
  }, [notebookProgress, userCollapsedIds]);

  const inProgress = isStarting || isStopping;
  const { currentProject: project, localQueues } = React.useContext(ProjectDetailsContext);
  const { isProjectKueueEnabled, isKueueFeatureEnabled } = useKueueConfiguration(project);
  const showResourcesTab = Boolean(isKueueFeatureEnabled && isProjectKueueEnabled);
  const [activeTab, setActiveTab] = React.useState<string>(PROGRESS_TAB);

  const kueueTrackingInput = React.useMemo(
    () => ({
      kueueStatus: kueueStatus ?? null,
      isStarting,
      isRunning,
      isStopping,
    }),
    [kueueStatus, isStarting, isRunning, isStopping],
  );

  const handleClose = React.useCallback(() => {
    if (trackStatusModalActions) {
      fireWorkbenchStatusModalAction(
        'close',
        TrackingOutcome.cancel,
        activeTab,
        kueueTrackingInput,
      );
    }
    onClose?.();
  }, [trackStatusModalActions, activeTab, kueueTrackingInput, onClose]);

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
  const quotaSource = clusterQueue?.spec.cohortName ?? '-';
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
    if (
      (isRunning && !showKueueMessage) ||
      (isStopped && !showKueueMessage) ||
      (spawnStatus?.status !== AlertVariant.danger && !inProgress && !showKueueMessage)
    ) {
      return null;
    }

    const effectiveKueueStatus = showKueueMessage ? kueueStatus.status : undefined;
    const kueueInfo =
      effectiveKueueStatus != null ? getKueueStatusInfo(effectiveKueueStatus) : null;

    let color: string;
    if (kueueInfo?.status === 'danger') {
      color = DangerColor.var;
    } else if (showKueueMessage && kueueInfo) {
      color = WarningColor.var;
    } else {
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
    }
    let kueueTitle: string | null = null;
    if (showKueueMessage) {
      const message =
        kueueStatus.status === KueueWorkloadStatus.Requeued
          ? getRequeuedMessage(kueueStatus)
          : getHumanReadableKueueMessage(
              kueueStatus.status,
              kueueStatus.message,
              kueueStatus.queueName,
            );
      if (kueueStatus.queuePosition != null && kueueStatus.status === KueueWorkloadStatus.Queued) {
        kueueTitle = `${message} (${formatQueuePosition(kueueStatus.queuePosition)})`;
      } else if (
        kueueStatus.queuePosition != null &&
        kueueStatus.status === KueueWorkloadStatus.Inadmissible
      ) {
        const pos = formatQueuePosition(kueueStatus.queuePosition, kueueStatus.queueName);
        kueueTitle = `${message} (${pos})`;
      } else {
        kueueTitle = message;
      }
    }
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
        <Content component="p" style={{ color }} data-testid="notebook-latest-status">
          {kueueInfo != null ? (
            kueueInfo.status ? (
              <Icon isInline status={kueueInfo.status}>
                <kueueInfo.IconComponent className={kueueInfo.iconClassName} />
              </Icon>
            ) : (
              <Icon isInline status="warning">
                <ExclamationTriangleIcon />
              </Icon>
            )
          ) : (!spawnStatus || spawnStatus.status === AlertVariant.info) && inProgress ? (
            <Icon isInline>
              <InProgressIcon style={{ color: BrandIconColor.var }} className="ai-u-spin" />
            </Icon>
          ) : spawnStatus?.status === AlertVariant.danger ? (
            <Icon isInline status="danger">
              <ExclamationCircleIcon />
            </Icon>
          ) : spawnStatus?.status === AlertVariant.warning ? (
            <Icon isInline status="warning">
              <ExclamationTriangleIcon />
            </Icon>
          ) : null}{' '}
          {title}
        </Content>
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

  const treeData: TreeViewDataItem[] = React.useMemo(() => {
    const kueueInfoStatus = kueueStatus ? getKueueStatusInfo(kueueStatus.status).status : undefined;
    const kueueLabelColor =
      kueueInfoStatus === 'danger' ? DangerColor.var : kueueStatus ? WarningColor.var : undefined;

    return notebookProgress.map((step) => {
      const nodeId = `${step.stepKind}-${step.containerName ?? ''}`;
      return {
        id: nodeId,
        name: (
          <Flex
            component="span"
            gap={{ default: 'gapSm' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
            flexWrap={{ default: 'nowrap' }}
            data-testid={`step-status-${step.status}`}
          >
            <FlexItem component="span" style={{ flexShrink: 0 }}>
              {stepIcons[step.status]}
            </FlexItem>
            <FlexItem component="span">
              {step.label}
              {step.description && <Content component="small">{step.description}</Content>}
            </FlexItem>
          </Flex>
        ),
        children: step.subSteps?.map((sub) => ({
          id: `${sub.stepKind}-${sub.containerName ?? ''}`,
          name: (
            <Flex
              component="span"
              gap={{ default: 'gapSm' }}
              alignItems={{ default: 'alignItemsFlexStart' }}
              flexWrap={{ default: 'nowrap' }}
              data-testid={`step-status-${sub.status}`}
            >
              <FlexItem component="span" style={{ flexShrink: 0 }}>
                {stepIcons[sub.status]}
              </FlexItem>
              <FlexItem component="span">
                <span
                  style={
                    sub.stepKind === 'kueue' &&
                    kueueLabelColor &&
                    sub.status !== EventStatus.SUCCESS
                      ? { color: kueueLabelColor }
                      : undefined
                  }
                >
                  {sub.label}
                </span>
                {sub.description && <Content component="small">{sub.description}</Content>}
              </FlexItem>
            </Flex>
          ),
        })),
        defaultExpanded: expandedNodeIds.has(nodeId),
        isExpanded: expandedNodeIds.has(nodeId),
      };
    });
  }, [notebookProgress, expandedNodeIds, kueueStatus]);

  const renderProgress = () => (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }} style={{ height: '100%' }}>
      <FlexItem>
        <HelperText>
          <HelperTextItem
            variant="indeterminate"
            icon={<InfoCircleIcon style={{ color: PurpleColor.var }} />}
            style={{ fontWeight: BoldWeight.var }}
          >
            Steps may repeat or occur in any order, depending on the workbench&apos;s priority in
            the queue and current resource availability.
          </HelperTextItem>
        </HelperText>
      </FlexItem>
      <FlexItem
        flex={{ default: 'flex_1' }}
        className="start-notebook-modal__progress-scroll"
        data-testid="notebook-startup-steps"
      >
        <TreeView
          data={treeData}
          hasGuides
          aria-label="Notebook startup progress"
          onExpand={(_, item) => {
            if (item.id) {
              const { id } = item;
              setExpandedNodeIds((prev) => new Set([...prev, id]));
              setUserCollapsedIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
              const parentStep = notebookProgress.find(
                (step) => `${step.stepKind}-${step.containerName ?? ''}` === id,
              );
              const subStep = notebookProgress
                .flatMap((step) => step.subSteps ?? [])
                .find((sub) => `${sub.stepKind}-${sub.containerName ?? ''}` === id);
              const stepName = parentStep?.label ?? subStep?.label ?? id;
              fireWorkbenchProgressStepExpanded(stepName, kueueStatus);
            }
          }}
          onCollapse={(_, item) => {
            if (item.id) {
              const { id } = item;
              setExpandedNodeIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
              setUserCollapsedIds((prev) => new Set([...prev, id]));
            }
          }}
        />
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
      onClose={handleClose}
      data-testid="notebook-status-modal"
    >
      <ModalHeader
        data-testid="notebook-status-modal-header"
        title={
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              {notebook ? `${getNotebookDisplayName(notebook)} status` : 'Workbench status'}
            </FlexItem>
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
              onSelect={(_ev, tabIndex) => {
                const nextTab = `${tabIndex}`;
                if (nextTab !== activeTab) {
                  const { primaryWorkbenchStatus, kueueSubState } =
                    getWorkbenchKueueTrackingProperties(kueueTrackingInput);
                  fireMiscTrackingEvent(WorkbenchTrackingEvent.StatusModalTabSwitched, {
                    progressTab: nextTab === PROGRESS_TAB,
                    eventlogTab: nextTab === EVENT_LOG_TAB,
                    resourcesTab: nextTab === RESOURCES_TAB,
                    primaryWorkbenchStatus,
                    kueueSubState,
                  });
                }
                setActiveTab(nextTab);
              }}
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
      <ModalFooter>{typeof buttons === 'function' ? buttons({ activeTab }) : buttons}</ModalFooter>
    </Modal>
  );
};

export default StartNotebookModal;
