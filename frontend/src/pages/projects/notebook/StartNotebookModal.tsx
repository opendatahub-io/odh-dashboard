import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  List,
  ListItem,
  Modal,
  ModalVariant,
  Panel,
  PanelMain,
  Progress,
  ProgressVariant,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { EventStatus, NotebookStatus } from '~/types';
import { EventKind } from '~/k8sTypes';
import NotebookRouteLink from './NotebookRouteLink';
import { NotebookState } from './types';
import { getEventFullMessage } from './utils';

type StartNotebookModalProps = {
  isOpen: boolean;
  notebookState: NotebookState;
  notebookStatus: NotebookStatus | null;
  events: EventKind[];
  onClose: (stopped: boolean) => void;
};

type SpawnStatus = {
  status: AlertVariant;
  title: string;
  description: React.ReactNode;
};

const StartNotebookModal: React.FC<StartNotebookModalProps> = ({
  isOpen,
  notebookStatus,
  events,
  notebookState,
  onClose,
}) => {
  const { notebook, isRunning, isStarting } = notebookState;
  const [spawnPercentile, setSpawnPercentile] = React.useState(0);
  const [spawnStatus, setSpawnStatus] = React.useState<SpawnStatus | null>(null);

  const spawnFailed = spawnStatus?.status === AlertVariant.danger;

  React.useEffect(() => {
    if (!isOpen) {
      // Reset the modal
      setSpawnPercentile(0);
      setSpawnStatus(null);
    } else if (isRunning) {
      setSpawnPercentile(100);
      setSpawnStatus({
        status: AlertVariant.success,
        title: 'Success',
        description: 'The notebook server is up and running.',
      });
    }
  }, [isOpen, isRunning]);

  React.useEffect(() => {
    if (isStarting && !isRunning && isOpen) {
      if (!notebookStatus) {
        return;
      }
      if (notebookStatus.currentStatus === EventStatus.IN_PROGRESS) {
        setSpawnPercentile(notebookStatus.percentile);
        setSpawnStatus(null);
      } else if (notebookStatus.currentStatus === EventStatus.ERROR) {
        setSpawnStatus({
          status: AlertVariant.danger,
          title: notebookStatus.currentEventReason,
          description: notebookStatus.currentEventDescription,
        });
      } else if (notebookStatus.currentStatus === EventStatus.INFO) {
        setSpawnStatus({
          status: AlertVariant.info,
          title: notebookStatus.currentEventReason,
          description: notebookStatus.currentEventDescription,
        });
      } else {
        setSpawnStatus({
          status: AlertVariant.warning,
          title: notebookStatus.currentEventReason,
          description: notebookStatus.currentEventDescription,
        });
      }
    }
  }, [notebookStatus, isStarting, isRunning, isOpen]);

  const renderProgress = () => {
    let variant: ProgressVariant | undefined;
    switch (spawnStatus?.status) {
      case AlertVariant.danger:
        variant = ProgressVariant.danger;
        break;
      case AlertVariant.success:
        variant = ProgressVariant.success;
        break;
      case AlertVariant.warning:
        variant = ProgressVariant.warning;
        break;
      default:
        variant = undefined;
    }

    const currentEvent = notebookStatus?.currentEvent;
    let title: string;
    if (events.length > 0 && currentEvent) {
      title = currentEvent;
    } else if (isOpen && !isStarting) {
      title = 'Creating resources...';
    } else {
      title = 'Waiting for server request to start...';
    }
    return (
      <Progress data-id="progress-bar" value={spawnPercentile} title={title} variant={variant} />
    );
  };

  const renderStatus = () => {
    if (!spawnStatus) {
      return null;
    }
    return (
      <Alert isInline variant={spawnStatus.status} title={spawnStatus.title}>
        <p>{spawnStatus.description}</p>
      </Alert>
    );
  };

  const renderButtons = () =>
    !isRunning ? (
      <Button
        data-id="close-spawn"
        key="cancel"
        variant={spawnFailed ? 'primary' : 'secondary'}
        onClick={() => onClose(true)}
        isDisabled={!open}
      >
        Cancel
      </Button>
    ) : (
      <NotebookRouteLink
        label="Open"
        notebook={notebook}
        isRunning={isRunning}
        variant={ButtonVariant.primary}
      />
    );
  const renderLogs = () => (
    <Stack hasGutter>
      <StackItem>
        <strong>Event log</strong>
      </StackItem>
      <StackItem>
        <Panel isScrollable>
          <PanelMain maxHeight="250px">
            <List isPlain isBordered data-id="event-logs">
              {events
                .slice()
                .reverse()
                .map((event, index) => (
                  <ListItem key={`notebook-event-${event.metadata.uid ?? index}`}>
                    {getEventFullMessage(event)}
                  </ListItem>
                ))}
              <ListItem>Server requested</ListItem>
            </List>
          </PanelMain>
        </Panel>
      </StackItem>
    </Stack>
  );

  return (
    <Modal
      aria-label="Starting server modal"
      description="Depending on the size and resources requested, this can take several minutes."
      appendTo={document.body}
      variant={ModalVariant.small}
      title="Starting server"
      isOpen={isOpen}
      showClose
      onClose={() => onClose(false)}
    >
      <Stack hasGutter>
        <StackItem>{renderProgress()}</StackItem>
        <StackItem>{renderStatus()}</StackItem>
        <StackItem>{renderButtons()}</StackItem>
        <StackItem>{renderLogs()}</StackItem>
      </Stack>
    </Modal>
  );
};

export default StartNotebookModal;
