import * as React from 'react';
import { Switch } from '@patternfly/react-core';
import { startNotebook, stopNotebook } from '../../../api';
import { NotebookState } from './types';

type NotebookStatusToggleProps = {
  notebookState: NotebookState;
};

const NotebookStatusToggle: React.FC<NotebookStatusToggleProps> = ({
  notebookState: { notebook, isStarting, isRunning, refresh },
}) => {
  const [inProgress, setInProgress] = React.useState(false);
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

  return (
    <Switch
      label={label}
      isDisabled={inProgress || startingNotRunning}
      id={notebookName}
      isChecked={isChecked}
      onClick={() => {
        setInProgress(true);
        if (isRunning) {
          stopNotebook(notebookName, notebookNamespace).then(() => {
            refresh().then(() => setInProgress(false));
          });
        } else {
          startNotebook(notebookName, notebookNamespace).then(() => {
            refresh().then(() => setInProgress(false));
          });
        }
      }}
    />
  );
};

export default NotebookStatusToggle;
