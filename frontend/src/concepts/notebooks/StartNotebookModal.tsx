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
  ProgressStep,
  ProgressStepper,
  ProgressStepVariant,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
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
import EventLog from '#~/concepts/k8s/EventLog/EventLog';
import NotebookStatusLabel from './NotebookStatusLabel';
import '#~/concepts/dashboard/ModalStyles.scss';

const PROGRESS_TAB = 'Progress';
const EVENT_LOG_TAB = 'Events log';

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
  onClose,
  buttons,
}) => {
  const [spawnStatus, setSpawnStatus] = React.useState<SpawnStatus | null>(null);
  const isError = notebookStatus?.currentStatus === EventStatus.ERROR;
  const isStopped = !isError && !isRunning && !isStarting && !isStopping;
  const notebookProgress = useNotebookProgress(notebook, isRunning, isStopping, isStopped, events);
  const inProgress = !isStopped && (isStarting || isStopping || !isRunning);
  const [activeTab, setActiveTab] = React.useState<string>(PROGRESS_TAB);

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
    if (isRunning || isStopped || (spawnStatus?.status !== AlertVariant.danger && !inProgress)) {
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

    const title =
      notebookStatus?.currentEvent ||
      (isStarting
        ? 'Waiting for server request to start...'
        : isStopping
        ? 'Shutting down the server...'
        : 'Creating resources...');

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
    <Panel className="odh-modal__scrollable-panel">
      <PanelMain>
        {(isStopped || isRunning) && events.length === 0 ? (
          <span style={{ color: DisabledColor.var }}>There are no recent events.</span>
        ) : (
          <EventLog events={events} initialMessage="Server requested" dataTestId="event-logs" />
        )}
      </PanelMain>
    </Panel>
  );

  const renderProgress = () => (
    <Flex
      direction={{ default: 'column' }}
      gap={{ default: 'gapMd' }}
      style={{ overflowY: 'auto', height: '100%' }}
    >
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
      <FlexItem flex={{ default: 'flex_1' }} style={{ overflowY: 'auto' }}>
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
              />
            </FlexItem>
          </Flex>
        }
      />
      <ModalBody className="odh-modal__content-height" style={{ height: '470px' }}>
        <Stack hasGutter>
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
            </Tabs>
          </StackItem>
          <StackItem isFilled className="odh-modal__filled-stack-item">
            {activeTab === PROGRESS_TAB ? renderProgress() : renderLogs()}
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>{buttons}</ModalFooter>
    </Modal>
  );
};

export default StartNotebookModal;
