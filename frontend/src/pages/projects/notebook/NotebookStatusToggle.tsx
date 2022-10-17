import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { startNotebook, stopNotebook } from '../../../api';
import { NotebookState } from './types';
import useRefreshNotebookUntilStart from './useRefreshNotebookUntilStart';
import StopNotebookConfirmModal from './StopNotebookConfirmModal';
import useStopNotebookModalAvailability from './useStopNotebookModalAvailability';

type NotebookStatusToggleProps = {
  notebookState: NotebookState;
};

const NotebookStatusToggle: React.FC<NotebookStatusToggleProps> = ({ notebookState }) => {
  const { notebook, isStarting, isRunning, refresh } = notebookState;
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [inProgress, setInProgress] = React.useState(false);
  const listenToNotebookStart = useRefreshNotebookUntilStart(notebookState);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const notebookName = notebook.metadata.name;
  const notebookNamespace = notebook.metadata.namespace;
  const startingNotRunning = isStarting && !isRunning;
  const isRunningOrStarting = isStarting || isRunning;

  /** If in progress, it is faking the opposite */
  const isChecked = inProgress ? !isRunningOrStarting : isRunningOrStarting;

  let label = '';
  if (startingNotRunning) {
    label = 'Starting...';
  } else if (inProgress) {
    label = isChecked ? 'Starting...' : 'Stopping...';
  } else {
    label = isRunning ? 'Started' : 'Stopped';
  }

  const handleStop = () => {
    setInProgress(true);
    stopNotebook(notebookName, notebookNamespace).then(() => {
      refresh().then(() => setInProgress(false));
    });
  };

  return (
    <>
      <Switch
        label={label}
        isDisabled={inProgress || startingNotRunning}
        id={notebookName}
        isChecked={isChecked}
        onClick={() => {
          if (isRunning) {
            if (dontShowModalValue) {
              handleStop();
            } else {
              setOpenConfirm(true);
            }
          } else {
            setInProgress(true);
            startNotebook(notebookName, notebookNamespace).then(() => {
              refresh().then(() => setInProgress(false));
              listenToNotebookStart();
            });
          }
        }}
      />
      <StopNotebookConfirmModal
        isOpen={isOpenConfirm}
        notebook={notebook}
        onClose={(confirmStatus) => {
          if (confirmStatus) {
            handleStop();
          }
          setOpenConfirm(false);
        }}
      />
    </>
  );
};

export default NotebookStatusToggle;
