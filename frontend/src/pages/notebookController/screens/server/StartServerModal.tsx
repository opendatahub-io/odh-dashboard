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
import {
  checkNotebookRunning,
  getNotebookStatus,
} from '../../../../utilities/notebookControllerUtils';
import { useWatchNotebookEvents } from '../../../../utilities/useWatchNotebookEvents';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import { EventStatus, Notebook } from '../../../../types';
import useNamespaces from '../../../../pages/notebookController/useNamespaces';

import '../../NotebookController.scss';

type StartServerModalProps = {
  notebook?: Notebook;
  startShown: boolean;
  setStartModalShown: (shown: boolean) => void;
  onClose: () => void;
};

type SpawnStatus = {
  status: AlertVariant;
  title: string;
  description: React.ReactNode;
};

const StartServerModal: React.FC<StartServerModalProps> = ({
  notebook,
  startShown,
  setStartModalShown,
  onClose,
}) => {
  const { lastNotebookCreationTime } = React.useContext(NotebookControllerContext);
  const { notebookNamespace } = useNamespaces();
  const [spawnInProgress, setSpawnInProgress] = React.useState<boolean>(false);
  const [logsExpanded, setLogsExpanded] = React.useState<boolean>(false);
  const [spawnPercentile, setSpawnPercentile] = React.useState<number>(0);
  const [spawnStatus, setSpawnStatus] = React.useState<SpawnStatus | null>(null);

  const isNotebookRunning = checkNotebookRunning(notebook);
  const notebookLink = notebook?.metadata.annotations?.['opendatahub.io/link'];

  const notebookEvents = useWatchNotebookEvents(
    notebookNamespace,
    notebook?.metadata.name || '',
    spawnInProgress,
  );
  const spawnFailed =
    spawnStatus?.status === AlertVariant.danger || spawnStatus?.status === AlertVariant.warning;

  const notebookStatus = getNotebookStatus(notebookEvents, lastNotebookCreationTime);

  const onUnload = React.useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
    return (e.returnValue = '');
  }, []);

  React.useEffect(() => {
    let timer;
    if (isNotebookRunning) {
      window.removeEventListener('beforeunload', onUnload);
      setSpawnInProgress(false);
      setSpawnPercentile(100);
      setSpawnStatus({
        status: AlertVariant.success,
        title: 'Success',
        description: 'The notebook server is up and running. This page will update momentarily.',
      });
      timer = setTimeout(() => {
        if (notebookLink) {
          window.location.href = notebookLink;
        } else {
          setSpawnStatus({
            status: AlertVariant.danger,
            title: 'Failed to redirect',
            description:
              'For unknown reasons the notebook server was unable to be redirected to. Please check your notebook status.',
          });
        }
      }, 6000);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isNotebookRunning, notebookLink, onUnload]);

  React.useEffect(() => {
    setSpawnInProgress(startShown);
    setSpawnStatus(null);
    setSpawnPercentile(0);
    setLogsExpanded(false);
    // Notify user if they are trying to refresh the page when spawning is in progress
    if (startShown) {
      window.addEventListener('beforeunload', onUnload);
    }
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [startShown, onUnload]);

  React.useEffect(() => {
    if (spawnInProgress && !isNotebookRunning) {
      if (!notebookStatus) {
        return;
      }
      if (notebookStatus.currentStatus === EventStatus.IN_PROGRESS) {
        setSpawnPercentile(notebookStatus.percentile);
      } else if (notebookStatus.currentStatus === EventStatus.ERROR) {
        setSpawnInProgress(false);
        setSpawnStatus({
          status: AlertVariant.danger,
          title: notebookStatus.currentEventReason,
          description: notebookStatus.currentEventDescription,
        });
      }
    }
  }, [notebookStatus, spawnInProgress, isNotebookRunning]);

  const renderProgress = () => {
    let variant;
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
    return (
      <Progress
        id="progress-bar"
        value={spawnPercentile}
        title={
          notebookStatus?.events.length
            ? notebookStatus.currentEvent
            : 'Waiting for server request to start...'
        }
        variant={variant}
      />
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
    !isNotebookRunning ? (
      <Button key="cancel" variant="secondary" onClick={onClose}>
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
        {notebookStatus?.events.reverse().map((event, index) => (
          <ListItem key={`notebook-event-${event.metadata.uid ?? index}`}>
            {`${event.lastTimestamp} [${event.type}] ${event.message}`}
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
      isOpen={startShown}
      showClose={spawnFailed}
      onClose={() => (isNotebookRunning ? setStartModalShown(false) : onClose())}
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
