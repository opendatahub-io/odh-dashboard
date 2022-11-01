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
): { notebooks: NotebookKind[]; loaded: boolean; error: Error | undefined } => {
  const {
    notebooks: { data, loaded, error },
  } = React.useContext(ProjectDetailsContext);

  const connectedNotebooks = React.useMemo(() => {
    if (!resourceName) {
      return [];
    }
    switch (context) {
      case ConnectedNotebookContext.PVC:
        return data.reduce<NotebookKind[]>((acc, { notebook }) => {
          const relatedPVCNames = getNotebookPVCNames(notebook);
          if (!relatedPVCNames.includes(resourceName)) {
            return acc;
          }

          return [...acc, notebook];
        }, []);
      case ConnectedNotebookContext.DATA_CONNECTION:
        return data.reduce<NotebookKind[]>((acc, { notebook }) => {
          const relatedEnvs = getNotebookSecretNames(notebook);
          if (!relatedEnvs.includes(resourceName)) {
            return acc;
          }

          return [...acc, notebook];
        }, []);
      default:
        return [];
    }
  }, [context, resourceName, data]);

  return {
    notebooks: connectedNotebooks,
    loaded,
    error,
  };
};

export default useRelatedNotebooks;
