import * as React from 'react';
import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { Notebook } from '~/types';
import { stopNotebook } from '~/services/notebookService';
import useNotification from '~/utilities/useNotification';
import { allSettledPromises } from '~/utilities/allSettledPromises';
import { useUser } from '~/redux/selectors';

type StopServerModalProps = {
  notebooksToStop: Notebook[];
  onNotebooksStop: (didStop: boolean) => void;
};

const StopServerModal: React.FC<StopServerModalProps> = ({ notebooksToStop, onNotebooksStop }) => {
  const notification = useNotification();
  const [isDeleting, setDeleting] = React.useState(false);

  const hasMultipleServers = notebooksToStop.length > 1;
  const textToShow = hasMultipleServers ? 'all servers' : 'server';

  const isModalShown = notebooksToStop.length !== 0;

  const { isAdmin } = useUser();

  const onClose = () => {
    onNotebooksStop(false);
  };

  const handleStopServer = () => {
    setDeleting(true);
    allSettledPromises<Notebook | void>(
      notebooksToStop.map((notebook) => {
        const notebookName = notebook.metadata.name || '';
        if (!notebookName) {
          return Promise.resolve();
        }

        if (!isAdmin) {
          return stopNotebook();
        }

        const notebookUser = notebook.metadata.annotations?.['opendatahub.io/username'];
        if (!notebookUser) {
          return Promise.resolve();
        }

        return stopNotebook(notebookUser);
      }),
    )
      .then(() => {
        setDeleting(false);
        onNotebooksStop(true);
      })
      .catch((e) => {
        setDeleting(false);
        notification.error(`Error stopping ${textToShow}`, e.message);
      });
  };

  const modalActions = [
    <Button
      data-id="stop-nb-button"
      data-testid="stop-nb-server-button"
      isDisabled={isDeleting}
      key="confirm"
      variant="primary"
      onClick={handleStopServer}
    >
      Stop {textToShow}
    </Button>,
    <Button data-id="cancel-button" key="cancel" variant="secondary" onClick={onClose}>
      Cancel
    </Button>,
  ];

  return (
    <Modal
      aria-label="Stop server modal"
      appendTo={document.body}
      variant={ModalVariant.small}
      title={`Stop ${textToShow}`}
      isOpen={isModalShown}
      showClose
      onClose={onClose}
      actions={modalActions}
    >
      Are you sure you want to stop {textToShow}? Any changes made without saving will be lost.
    </Modal>
  );
};

StopServerModal.displayName = 'StopServerModal';

export default StopServerModal;
