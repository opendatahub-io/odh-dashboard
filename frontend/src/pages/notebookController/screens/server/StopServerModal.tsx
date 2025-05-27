import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { Notebook } from '#~/types';
import StopWorkbenchModal from '#~/pages/projects/notebook/StopWorkbenchModal';

type StopServerModalProps = {
  notebooksToStop: Notebook[];
  link: string;
  isDeleting: boolean;
  dontShowModalValue: boolean;
  setShowModal: (showModal: boolean) => void;
  handleStopWorkbenches: () => void;
  setDontShowModalValue: (value: boolean) => void;
  onNotebooksStop: (didStop: boolean) => void;
};

const StopServerModal: React.FC<StopServerModalProps> = ({
  notebooksToStop,
  link,
  isDeleting,
  dontShowModalValue,
  setShowModal,
  handleStopWorkbenches,
  setDontShowModalValue,
  onNotebooksStop,
}) => {
  if (!notebooksToStop.length) {
    return null;
  }

  const hasMultipleServers = notebooksToStop.length > 1;
  const textToShow = hasMultipleServers ? 'all workbenches' : 'workbench';

  const getWorkbenchModalTitle = () => {
    if (hasMultipleServers) {
      return 'Stop all workbenches?';
    }
    return 'Stop workbench?';
  };

  const getWorkbenchName = () => {
    if (hasMultipleServers) {
      return <strong>workbenches</strong>;
    }

    const notebook = notebooksToStop.at(0);

    if (notebook) {
      return (
        <>
          <strong>
            {notebook.metadata.annotations?.['opendatahub.io/display-name'] ??
              notebook.metadata.name}
          </strong>{' '}
          workbench
        </>
      );
    }

    return <strong>workbench</strong>;
  };

  const onBeforeClose = (confirmStatus: boolean) => {
    if (!confirmStatus) {
      setDontShowModalValue(false);
      onNotebooksStop(false);
      setShowModal(false);
    } else {
      handleStopWorkbenches();
    }
  };

  const displayLink = () => {
    if (link !== '#' && notebooksToStop.length === 1) {
      return (
        <>
          <Button component="a" href={link} variant="link" isInline>
            open the workbench
          </Button>
        </>
      );
    }
    if (notebooksToStop.length === 1) {
      return 'open the workbench';
    }
    return 'open the workbenches';
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
    <StopWorkbenchModal
      workbenchName={getWorkbenchName()}
      isRunning
      modalActions={modalActions}
      link={displayLink()}
      dontShowModalValue={dontShowModalValue}
      setDontShowModalValue={setDontShowModalValue}
      onBeforeClose={onBeforeClose}
      title={getWorkbenchModalTitle()}
    />
  );
};

StopServerModal.displayName = 'StopServerModal';

export default StopServerModal;
