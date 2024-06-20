import * as React from 'react';
import { Alert } from '@patternfly/react-core';
import { NotebookState } from '~/pages/projects/notebook/types';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

type NotebookRestartAlertProps = {
  notebooks: NotebookState[];
  isCurrent?: boolean;
};

const NotebookRestartAlert: React.FC<NotebookRestartAlertProps> = ({ notebooks, isCurrent }) => {
  const runningNotebooks = notebooks.filter((notebookState) => notebookState.isRunning);
  return (
    <Alert
      data-testid="notebook-restart-alert"
      component="h2"
      variant="info"
      isInline
      title="Unsaved work will be lost"
    >
      {isCurrent
        ? 'Updating this workbench will cause it to restart. '
        : 'Running workbenches will restart upon updating. '}
      To avoid losing your work, save any recent data
      {runningNotebooks.length === 0 || isCurrent
        ? '.'
        : ` in the following running workbenches: ${runningNotebooks
            .map((notebook) => getDisplayNameFromK8sResource(notebook.notebook))
            .join(', ')}.`}
    </Alert>
  );
};

export default NotebookRestartAlert;
