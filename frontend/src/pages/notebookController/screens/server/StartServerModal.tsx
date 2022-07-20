import * as React from 'react';
import { Alert, AlertVariant, Button, Modal, ModalVariant, Spinner } from '@patternfly/react-core';
import { Notebook } from '../../../../types';
import { checkNotebookRunning } from '../../../../utilities/notebookControllerUtils';

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
  reason: React.ReactNode;
};

const StartServerModal: React.FC<StartServerModalProps> = ({
  notebook,
  startShown,
  setStartModalShown,
  onClose,
}) => {
  const [spawnStatus, setSpawnStatus] = React.useState<SpawnStatus | null>(null);

  const isNotebookRunning = checkNotebookRunning(notebook);
  const notebookLink = notebook?.metadata.annotations?.['opendatahub.io/link'];

  React.useEffect(() => {
    let timer;
    if (isNotebookRunning) {
      setSpawnStatus({
        status: AlertVariant.success,
        title: 'Success',
        reason: 'The notebook server is up and running. This page will update momentarily.',
      });
      timer = setTimeout(() => {
        if (notebookLink) {
          window.location.href = notebookLink;
        } else {
          setSpawnStatus({
            status: AlertVariant.danger,
            title: 'Failed to redirect',
            reason:
              'For unknown reasons the notebook server was unable to be redirected to. Please check your notebook status.',
          });
        }
      }, 6000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isNotebookRunning, notebookLink]);

  const loading = () => (
    <>
      <Spinner isSVG aria-label="Starting server modal spinner" />
      <Button key="cancel" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
    </>
  );

  const running = () => (
    <p className="odh-notebook-controller__start-server-modal-text">
      Server ready at {notebookLink}
    </p>
  );

  const renderStatus = () => {
    if (!spawnStatus) {
      return null;
    }
    return (
      <Alert isInline variant={spawnStatus.status} title={spawnStatus.title}>
        <p>{spawnStatus.reason}</p>
      </Alert>
    );
  };

  return (
    <Modal
      aria-label="Starting server modal"
      className="odh-notebook-controller__start-server-modal"
      description="Depending on the size and resources requested, this can take several minutes."
      appendTo={document.body}
      variant={ModalVariant.small}
      title="Starting server"
      isOpen={startShown}
      showClose={
        spawnStatus?.status === AlertVariant.danger || spawnStatus?.status === AlertVariant.warning
      }
      onClose={() => (isNotebookRunning ? setStartModalShown(false) : onClose())}
    >
      {isNotebookRunning ? running() : loading()}
      {renderStatus()}
    </Modal>
  );
};

StartServerModal.displayName = 'StartServerModal';

export default StartServerModal;
