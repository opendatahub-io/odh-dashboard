import * as React from 'react';
import {
  Button,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Checkbox,
} from '@patternfly/react-core';
import { Notebook } from '#~/types';
import useStopNotebookModalAvailability from '#~/pages/projects/notebook/useStopNotebookModalAvailability';

type StopServerModalProps = {
  notebooksToStop: Notebook[];
  link: string;
  isDeleting: boolean;
  setShowModal: (showModal: boolean) => void;
  handleStopWorkbenches: () => void;
};

const StopServerModal: React.FC<StopServerModalProps> = ({
  notebooksToStop,
  link,
  isDeleting,
  setShowModal,
  handleStopWorkbenches,
}) => {
  const [dontShowModalValue, setDontShowModalValue] = useStopNotebookModalAvailability();

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

  const onBeforeClose = (confirmStatus: boolean) => {
    if (!confirmStatus) {
      setDontShowModalValue(false);
      setShowModal(false);
    } else {
      handleStopWorkbenches();
    }
  };

  const modalActions = [
    <Button
      data-testid="stop-workbench-button"
      isDisabled={isDeleting}
      key="confirm"
      variant="primary"
      onClick={() => onBeforeClose(true)}
    >
      Stop {textToShow}
    </Button>,
    <Button
      data-id="cancel-button"
      key="cancel"
      variant="secondary"
      onClick={() => onBeforeClose(false)}
    >
      Cancel
    </Button>,
  ];

  return (
    <Modal
      aria-label="Stop workbench modal"
      appendTo={document.body}
      variant="small"
      isOpen
      onClose={() => onBeforeClose(false)}
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
          <StackItem>
            <Checkbox
              id="dont-show-again"
              label="Don't show again"
              isChecked={dontShowModalValue}
              onChange={(e, checked) => setDontShowModalValue(checked)}
            />
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>{modalActions}</ModalFooter>
    </Modal>
  );
};

StopServerModal.displayName = 'StopServerModal';

export default StopServerModal;
