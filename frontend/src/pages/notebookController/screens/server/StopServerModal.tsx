import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { Notebook } from '#~/types';
import useStopNotebookModalAvailability from '#~/pages/projects/notebook/useStopNotebookModalAvailability';
import ConfirmStopModal from '#~/pages/projects/components/ConfirmStopModal.tsx';

type StopServerModalProps = {
  notebooksToStop: Notebook[];
  link?: string;
  isDeleting: boolean;
  onNotebooksStop: (didStop: boolean) => void;
};

const StopServerModal: React.FC<StopServerModalProps> = ({
  notebooksToStop,
  link,
  isDeleting,
  onNotebooksStop,
}) => {
  const [dontShowModalValue, setDontShowModalValue] = useStopNotebookModalAvailability();

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

    if (notebooksToStop.length === 0) {
      return <strong>workbench</strong>;
    }

    return (
      <>
        <strong>
          {notebooksToStop[0].metadata.annotations?.['opendatahub.io/display-name'] ??
            notebooksToStop[0].metadata.name}
        </strong>{' '}
        workbench
      </>
    );
  };

  const onBeforeClose = (confirmStatus: boolean) => {
    if (!confirmStatus) {
      setDontShowModalValue(false);
    }
    onNotebooksStop(confirmStatus);
  };

  const displayLink = () => {
    if (!!link && notebooksToStop.length === 1) {
      return (
        <>
          <Button data-testid="workbench-url" component="a" href={link} variant="link" isInline>
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
    <Button key="cancel" variant="secondary" onClick={() => onBeforeClose(false)}>
      Cancel
    </Button>,
  ];

  return (
    <ConfirmStopModal
      message={
        <>
          Any unsaved changes to the <strong>{getWorkbenchName()}</strong> will be lost.
        </>
      }
      isRunning
      modalActions={modalActions}
      link={displayLink()}
      onBeforeClose={onBeforeClose}
      title={getWorkbenchModalTitle()}
      dontShowModalValue={dontShowModalValue}
      setDontShowModalValue={setDontShowModalValue}
      saveChanges
      dataTestId="stop-server-modal"
    />
  );
};

StopServerModal.displayName = 'StopServerModal';

export default StopServerModal;
