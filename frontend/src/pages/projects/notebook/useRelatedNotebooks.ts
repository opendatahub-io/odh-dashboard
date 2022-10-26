import { NotebookKind } from '../../../k8sTypes';
import { getNotebookPVCNames, getNotebookSecretNames } from '../pvc/utils';
import * as React from 'react';
import { ProjectDetailsContext } from '../ProjectDetailsContext';

export enum ConnectedNotebookContext {
  PVC = 'pvc',
  DATA_CONNECTION = 'data-connection',
}

const useRelatedNotebooks = (
  context: ConnectedNotebookContext,
  resourceName?: string,
): { connectedNotebooks: NotebookKind[]; loaded: boolean; error: Error | undefined } => {
  const {
    notebooks: { data, loaded, error },
  } = React.useContext(ProjectDetailsContext);

  if (!resourceName) {
    return { connectedNotebooks: [], loaded: false, error };
  }

  let connectedNotebooks: NotebookKind[];
  switch (context) {
    case ConnectedNotebookContext.PVC:
      connectedNotebooks = data.reduce<NotebookKind[]>((acc, { notebook }) => {
        const relatedPVCNames = getNotebookPVCNames(notebook);
        if (!relatedPVCNames.includes(resourceName)) {
          return acc;
        }

        return [...acc, notebook];
      }, []);
      break;
    case ConnectedNotebookContext.DATA_CONNECTION:
      connectedNotebooks = data.reduce<NotebookKind[]>((acc, { notebook }) => {
        const relatedEnvs = getNotebookSecretNames(notebook);
        if (!relatedEnvs.includes(resourceName)) {
          return acc;
        }

        return [...acc, notebook];
      }, []);
      break;
    default:
      connectedNotebooks = [];
  }

  return {
    connectedNotebooks,
    loaded,
    error,
  };
};

export default useRelatedNotebooks;
