import * as React from 'react';
import {
  Button,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { Notebook } from '~/types';
import { stopNotebook } from '~/services/notebookService';
import useNotification from '~/utilities/useNotification';
import { allSettledPromises } from '~/utilities/allSettledPromises';
import { useUser } from '~/redux/selectors';

type StopServerModalProps = {
  notebooksToStop: Notebook[];
  link: string;
  onNotebooksStop: (didStop: boolean) => void;
};

const StopServerModal: React.FC<StopServerModalProps> = ({
  notebooksToStop,
  onNotebooksStop,
  link,
}) => {
  const notification = useNotification();
  const [isDeleting, setDeleting] = React.useState(false);

  const { isAdmin } = useUser();

  if (!notebooksToStop.length) {
    return null;
  }

  const hasMultipleServers = notebooksToStop.length > 1;
  const textToShow = hasMultipleServers ? 'all workbenches' : 'workbench';

  const getWorkbenchName = () => {
    if (hasMultipleServers) {
      return 'workbenches';
    }

    const notebook = notebooksToStop.at(0);

    if (notebook) {
      return (
        <>
          <b>
            {notebook.metadata.annotations?.['opendatahub.io/display-name'] ??
              notebook.metadata.name}
          </b>{' '}
          workbench
        </>
      );
    }

    return 'workbench';
  };

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
      data-testid="stop-workbench-button"
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
      aria-label="Stop workbench modal"
      appendTo={document.body}
      variant="small"
      isOpen
      onClose={onClose}
    >
      <ModalHeader title={`Stop ${textToShow}`} />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>Any unsaved changes to the {getWorkbenchName()} will be lost.</StackItem>
          <StackItem>
            To save changes,{' '}
            {link !== '#' && notebooksToStop.length === 1 ? (
              <>
                <Button component="a" href={link} variant="link" isInline>
                  open the workbench
                </Button>
                .
              </>
            ) : notebooksToStop.length === 1 ? (
              'open the workbench.'
            ) : (
              'open the workbenches.'
            )}
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>{modalActions}</ModalFooter>
    </Modal>
  );
};

StopServerModal.displayName = 'StopServerModal';

export default StopServerModal;
