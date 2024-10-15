import * as React from 'react';
import {
  ActionList,
  ActionListItem,
  Alert,
  AlertVariant,
  Button,
  ExpandableSection,
  List,
  ListItem,
  Progress,
  ProgressVariant,
} from '@patternfly/react-core';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { useNavigate } from 'react-router';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import {
  getEventTimestamp,
  useNotebookRedirectLink,
  useNotebookStatus,
} from '~/utilities/notebookControllerUtils';
import { EventStatus } from '~/types';
import { NotebookControllerContext } from '~/pages/notebookController/NotebookControllerContext';
import useBrowserTabPreference from './useBrowserTabPreference';

import '~/pages/notebookController/NotebookController.scss';

type StartServerModalProps = {
  spawnInProgress: boolean;
  onClose: () => void;
};

type SpawnStatus = {
  status: AlertVariant;
  title: string;
  description: React.ReactNode;
};

const StartServerModal: React.FC<StartServerModalProps> = ({ spawnInProgress, onClose }) => {
  const { currentUserNotebookIsRunning: isNotebookRunning } =
    React.useContext(NotebookControllerContext);
  const [logsExpanded, setLogsExpanded] = React.useState(false);
  const [spawnPercentile, setSpawnPercentile] = React.useState(0);
  const [spawnStatus, setSpawnStatus] = React.useState<SpawnStatus | null>(null);
  const [unstableNotebookStatus, events] = useNotebookStatus(spawnInProgress);
  const [isUsingCurrentTab] = useBrowserTabPreference();
  const notebookStatus = useDeepCompareMemoize(unstableNotebookStatus);
  const getNotebookLink = useNotebookRedirectLink();
  const navigate = useNavigate();
  const spawnFailed = spawnStatus?.status === AlertVariant.danger;

  const navigateToNotebook = React.useCallback(
    (useCurrentTab: boolean): void => {
      getNotebookLink()
        .then((notebookLink) => {
          if (useCurrentTab) {
            window.location.href = notebookLink;
          } else {
            window.open(notebookLink, '_blank');
            navigate('/notebookController');
          }
        })
        .catch(() => {
          setSpawnStatus({
            status: AlertVariant.danger,
            title: 'Failed to redirect',
            description:
              'For unknown reasons the notebook server was unable to be redirected to. Please check your notebook status.',
          });
        });
    },
    [getNotebookLink, navigate],
  );

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isNotebookRunning) {
      setSpawnPercentile(100);
      setSpawnStatus({
        status: AlertVariant.success,
        title: 'Success',
        description: `The notebook server is up and running.${
          isUsingCurrentTab ? ' This page will update momentarily.' : ''
        }`,
      });
      if (isUsingCurrentTab) {
        timer = setTimeout(() => navigateToNotebook(true), 6000);
      }
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isNotebookRunning, isUsingCurrentTab, navigateToNotebook]);

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
      } else {
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
    } else if (!spawnInProgress) {
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
      <Alert component="h2" isInline variant={spawnStatus.status} title={spawnStatus.title}>
        <p>{spawnStatus.description}</p>
      </Alert>
    );
  };

  const renderButtons = () =>
    !isNotebookRunning ? (
      <Button
        data-id="close-spawn"
        key="cancel"
        variant={spawnFailed ? 'primary' : 'secondary'}
        onClick={onClose}
        isDisabled={!open}
      >
        Cancel
      </Button>
    ) : isUsingCurrentTab ? null : (
      <ActionList>
        <ActionListItem>
          <Button
            variant="primary"
            key="open-new-tab-button"
            onClick={() => navigateToNotebook(false)}
          >
            Open in new tab
          </Button>
        </ActionListItem>
        <ActionListItem>
          <Button
            variant="secondary"
            key="open-new-tab-button"
            onClick={() => navigateToNotebook(true)}
          >
            Open in current tab
          </Button>
        </ActionListItem>
      </ActionList>
    );

  const renderLogs = () => (
    <ExpandableSection
      data-id="expand-logs"
      data-testid="expand-logs"
      toggleText={`${logsExpanded ? 'Collapse' : 'Expand'} event log`}
      onToggle={(e, isExpanded) => setLogsExpanded(isExpanded)}
      isExpanded={logsExpanded}
      isIndented
    >
      <List isPlain isBordered tabIndex={0}>
        {events
          .slice()
          .toSorted(
            (a, b) =>
              new Date(getEventTimestamp(b)).getTime() - new Date(getEventTimestamp(a)).getTime(),
          )
          .map((event, index) => (
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
      isOpen
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

export default StartServerModal;
