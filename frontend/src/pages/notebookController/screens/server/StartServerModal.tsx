import * as React from 'react';
import { AlertVariant } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { useNotebookRedirectLink, useNotebookStatus } from '#~/utilities/notebookControllerUtils';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import StartNotebookModal from '#~/concepts/notebooks/StartNotebookModal';
import { ButtonAction } from '#~/components/modals/GenericModalFooter';
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

  const makeButtons = (): ButtonAction[] | undefined => {
    if (!isNotebookRunning) {
      return [
        {
          label: 'Cancel',
          dataTestId: 'close-spawn',
          variant: spawnFailed ? 'primary' : 'secondary',
          onClick: onClose,
          isDisabled: !open,
          clickOnEnter: true,
        },
      ];
    }

    if (!isUsingCurrentTab) {
      return [
        {
          label: 'Open in new tab',
          variant: 'primary',
          onClick: () => navigateToNotebook(false),
          dataTestId: 'open-new-tab-button',
          clickOnEnter: true,
        },
        {
          label: 'Open in current tab',
          variant: 'secondary',
          onClick: () => navigateToNotebook(true),
          dataTestId: 'open-current-tab-button',
        },
      ];
    }

    return undefined;
  };

  return (
    <StartNotebookModal
      isStarting={spawnInProgress}
      isRunning={isNotebookRunning}
      isStopping={false}
      notebookStatus={notebookStatus}
      events={events}
      buttonActions={makeButtons()}
    />
  );
};

export default StartServerModal;
