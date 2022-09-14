import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  ExpandableSection,
  List,
  ListItem,
  Modal,
  ModalVariant,
  Progress,
  ProgressVariant,
} from '@patternfly/react-core';
import { useDeepCompareMemoize } from '../../../../utilities/useDeepCompareMemoize';
import {
  getEventTimestamp,
  useNotebookRedirectLink,
  useNotebookStatus,
} from '../../../../utilities/notebookControllerUtils';
import { EventStatus } from '../../../../types';
import { NotebookControllerContext } from '../../NotebookControllerContext';

import '../../NotebookController.scss';

type StartServerModalProps = {
  spawnInProgress: boolean;
  open: boolean;
  onClose: () => void;
};

type SpawnStatus = {
  status: AlertVariant;
  title: string;
  description: React.ReactNode;
};

const StartServerModal: React.FC<StartServerModalProps> = ({ open, spawnInProgress, onClose }) => {
  const { currentUserNotebookIsRunning: isNotebookRunning } =
    React.useContext(NotebookControllerContext);
  const [logsExpanded, setLogsExpanded] = React.useState<boolean>(false);
  const [spawnPercentile, setSpawnPercentile] = React.useState<number>(0);
  const [spawnStatus, setSpawnStatus] = React.useState<SpawnStatus | null>(null);
  const [unstableNotebookStatus, events] = useNotebookStatus(spawnInProgress);
  const notebookStatus = useDeepCompareMemoize(unstableNotebookStatus);
  const getNotebookLink = useNotebookRedirectLink();

  React.useEffect(() => {
    if (!open) {
      // Reset the modal
      setLogsExpanded(false);
      setSpawnPercentile(0);
      setSpawnStatus(null);
    }
  }, [open]);

  const spawnFailed = spawnStatus?.status === AlertVariant.danger;

  React.useEffect(() => {
    let timer;
    if (isNotebookRunning) {
      setSpawnPercentile(100);
      setSpawnStatus({
        status: AlertVariant.success,
        title: 'Success',
        description: 'The notebook server is up and running. This page will update momentarily.',
      });
      timer = setTimeout(() => {
        getNotebookLink()
          .then((notebookLink) => {
            window.location.href = notebookLink;
          })
          .catch(() => {
            setSpawnStatus({
              status: AlertVariant.danger,
              title: 'Failed to redirect',
              description:
                'For unknown reasons the notebook server was unable to be redirected to. Please check your notebook status.',
            });
          });
      }, 6000);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isNotebookRunning, getNotebookLink]);

  React.useEffect(() => {
    if (spawnInProgress && !isNotebookRunning) {
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
      } else if (notebookStatus.currentStatus === EventStatus.WARNING) {
        setSpawnStatus({
          status: AlertVariant.warning,
          title: notebookStatus.currentEventReason,
          description: notebookStatus.currentEventDescription,
        });
      }
    }
  }, [notebookStatus, spawnInProgress, isNotebookRunning]);

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
    } else if (open && !spawnInProgress) {
      title = 'Creating resources...';
    } else {
      title = 'Waiting for server request to start...';
    }
    return <Progress id="progress-bar" value={spawnPercentile} title={title} variant={variant} />;
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
    !isNotebookRunning ? (
      <Button
        key="cancel"
        variant={spawnFailed ? 'primary' : 'secondary'}
        onClick={onClose}
        isDisabled={!open}
      >
        {spawnFailed ? 'Close' : 'Cancel'}
      </Button>
    ) : null;

  const renderLogs = () => (
    <ExpandableSection
      toggleText={`${logsExpanded ? 'Collapse' : 'Expand'} event log`}
      onToggle={(isExpanded) => setLogsExpanded(isExpanded)}
      isExpanded={logsExpanded}
      isIndented
    >
      <List isPlain isBordered>
        {events.reverse().map((event, index) => (
          <ListItem key={`notebook-event-${event.metadata.uid ?? index}`}>
            {`${getEventTimestamp(event)} [${event.type}] ${event.message}`}
          </ListItem>
        ))}
        <ListItem>Server requested</ListItem>
      </List>
    </ExpandableSection>
  );

  return (
    <Modal
      aria-label="Starting server modal"
      className="odh-notebook-controller__start-server-modal"
      description="Depending on the size and resources requested, this can take several minutes. To track progress, expand the event log."
      appendTo={document.body}
      variant={ModalVariant.small}
      title="Starting server"
      isOpen={open}
      showClose={spawnFailed}
      onClose={onClose}
    >
      {renderProgress()}
      {renderStatus()}
      {renderButtons()}
      {renderLogs()}
    </Modal>
  );
};

StartServerModal.displayName = 'StartServerModal';

export default StartServerModal;
