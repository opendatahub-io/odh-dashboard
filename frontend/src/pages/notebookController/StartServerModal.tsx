import * as React from 'react';
import {
  ActionList,
  ActionListItem,
  Button,
  Modal,
  ModalVariant,
  Spinner,
} from '@patternfly/react-core';
import NotebookControllerContext from './NotebookControllerContext';

import './NotebookController.scss';

type StartServerModalProps = {
  startShown: boolean;
  setStartModalShown: (shown: boolean) => void;
  onClose: () => void;
};

const StartServerModal: React.FC<StartServerModalProps> = ({
  startShown,
  setStartModalShown,
  onClose,
}) => {
  const { notebook, isNotebookRunning } = React.useContext(NotebookControllerContext);

  const loading = () => (
    <>
      <Spinner isSVG aria-label="Starting server modal spinner" />
      <Button key="cancel" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
    </>
  );

  const running = () => (
    <>
      <p className="odh-notebook-controller__start-server-modal-text">
        Server ready at {notebook?.metadata.annotations?.['opendatahub.io/link']}
      </p>
      <ActionList>
        <ActionListItem>
          <Button
            onClick={() => window.open(notebook?.metadata.annotations?.['opendatahub.io/link'])}
          >
            Access server
          </Button>
        </ActionListItem>
        <ActionListItem>
          <Button variant="link" onClick={() => setStartModalShown(false)}>
            Notebook server control panel
          </Button>
        </ActionListItem>
      </ActionList>
    </>
  );

  return (
    <Modal
      aria-label="Starting server modal"
      className="odh-notebook-controller__start-server-modal"
      description="Depending on the size and resources requested, this can take several minutes."
      appendTo={document.body}
      variant={ModalVariant.small}
      title="Starting server"
      isOpen={startShown}
      showClose
      onClose={onClose}
    >
      {isNotebookRunning ? running() : loading()}
    </Modal>
  );
};

StartServerModal.displayName = 'StartServerModal';

export default StartServerModal;
