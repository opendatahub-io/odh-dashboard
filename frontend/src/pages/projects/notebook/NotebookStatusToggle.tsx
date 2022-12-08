import * as React from 'react';
import { Flex, FlexItem, Switch } from '@patternfly/react-core';
import { startNotebook, stopNotebook } from '../../../api';
import { NotebookState } from './types';
import useRefreshNotebookUntilStart from './useRefreshNotebookUntilStart';
import StopNotebookConfirmModal from './StopNotebookConfirmModal';
import useStopNotebookModalAvailability from './useStopNotebookModalAvailability';
import NotebookStatusText from './NotebookStatusText';

type NotebookStatusToggleProps = {
  notebookState: NotebookState;
  doListen: boolean;
};

const NotebookStatusToggle: React.FC<NotebookStatusToggleProps> = ({ notebookState, doListen }) => {
  const { notebook, isStarting, isRunning, refresh } = notebookState;
  const [isOpenConfirm, setOpenConfirm] = React.useState(false);
  const [inProgress, setInProgress] = React.useState(false);
  const listenToNotebookStart = useRefreshNotebookUntilStart(notebookState, doListen);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const notebookName = notebook.metadata.name;
  const notebookNamespace = notebook.metadata.namespace;
  const isRunningOrStarting = isStarting || isRunning;

  /** If in progress, it is faking the opposite */
  const isChecked = inProgress ? !isRunningOrStarting : isRunningOrStarting;

  let label = '';
  if (isStarting) {
    label = 'Starting...';
  } else if (inProgress) {
    label = isChecked ? 'Starting...' : 'Stopping...';
  } else {
    label = isRunning ? 'Running' : 'Stopped';
  }

  const handleStop = React.useCallback(() => {
    setInProgress(true);
    stopNotebook(notebookName, notebookNamespace).then(() => {
      refresh().then(() => setInProgress(false));
      listenToNotebookStart(false);
    });
  }, [notebookName, notebookNamespace, refresh, listenToNotebookStart]);

  return (
    <>
      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Switch
            aria-label={label}
            isDisabled={inProgress}
            id={`${notebookName}-${notebookNamespace}`}
            isChecked={isChecked}
            onClick={() => {
              if (isRunningOrStarting) {
                if (dontShowModalValue) {
                  handleStop();
                } else {
                  setOpenConfirm(true);
                }
              } else {
                setInProgress(true);
                startNotebook(notebookName, notebookNamespace).then(() => {
                  refresh().then(() => setInProgress(false));
                  listenToNotebookStart(true);
                });
              }
            }}
          />
        </FlexItem>
        <FlexItem>
          <NotebookStatusText
            notebookState={notebookState}
            stopNotebook={handleStop}
            labelText={label}
          />
        </FlexItem>
      </Flex>
      <StopNotebookConfirmModal
        isOpen={isOpenConfirm}
        notebookState={notebookState}
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
