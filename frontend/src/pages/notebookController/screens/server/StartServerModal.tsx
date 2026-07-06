import * as React from 'react';
import { ActionList, ActionListItem, AlertVariant, Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { useNotebookRedirectLink, useNotebookStatus } from '#~/utilities/notebookControllerUtils';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import StartNotebookModal from '#~/concepts/notebooks/StartNotebookModal';
import useBrowserTabPreference from './useBrowserTabPreference';

import '#~/pages/notebookController/NotebookController.scss';

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
  const {
    currentUserNotebookIsRunning: isNotebookRunning,
    currentUserNotebook,
    currentUserNotebookPodUID,
  } = React.useContext(NotebookControllerContext);
  const [spawnStatus, setSpawnStatus] = React.useState<SpawnStatus | null>(null);
  const [unstableNotebookStatus, events] = useNotebookStatus(
    spawnInProgress,
    currentUserNotebook,
    isNotebookRunning,
    currentUserNotebookPodUID,
  );
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
            navigate('/notebook-controller');
          }
        })
        .catch(() => {
          setSpawnStatus({
            status: AlertVariant.danger,
            title: 'Failed to redirect',
            description:
              'For unknown reasons the workbench was unable to be redirected to. Please check your workbench status.',
          });
        });
    },
    [getNotebookLink, navigate],
  );

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isNotebookRunning) {
      if (isUsingCurrentTab) {
        timer = setTimeout(() => navigateToNotebook(true), 6000);
      }
    }
    return () => {
      clearTimeout(timer);
    };
  }, [isNotebookRunning, isUsingCurrentTab, navigateToNotebook]);

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

  return (
    <StartNotebookModal
      isStarting={spawnInProgress}
      isRunning={isNotebookRunning}
      isStopping={false}
      notebookStatus={notebookStatus}
      events={events}
      buttons={renderButtons()}
    />
  );
};

export default StartServerModal;
