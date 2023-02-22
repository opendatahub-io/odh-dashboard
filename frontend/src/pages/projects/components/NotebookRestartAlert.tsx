import * as React from 'react';
import { Alert } from '@patternfly/react-core';
import { NotebookState } from '../notebook/types';
import { getNotebookDisplayName } from '../utils';

type NotebookRestartAlertProps = {
  notebooks: NotebookState[];
  isCurrent?: boolean;
};

const NotebookRestartAlert: React.FC<NotebookRestartAlertProps> = ({ notebooks, isCurrent }) => {
  const runningNotebooks = notebooks.filter((notebookState) => notebookState.isRunning);
  return (
    <Alert variant="info" isInline title="Unsaved work will be lost">
      {isCurrent
        ? 'Updating this workbench will cause it to restart. '
        : 'Running workbenches will restart upon updating. '}
      To avoid losing your work, save any recent data
      {runningNotebooks.length === 0 || isCurrent
        ? '.'
        : ` in the following running workbenches: ${runningNotebooks
            .map((notebook) => getNotebookDisplayName(notebook.notebook))
            .join(', ')}.`}
    </Alert>
  );
};

export default NotebookRestartAlert;
