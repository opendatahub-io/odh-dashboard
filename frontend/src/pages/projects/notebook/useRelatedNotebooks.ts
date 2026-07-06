import * as React from 'react';
import { NotebookKind } from '#~/k8sTypes';
import { getNotebookPVCNames, getNotebookSecretNames } from '#~/pages/projects/pvc/utils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { DATA_CONNECTION_PREFIX } from '#~/api';
import { getNotebookPVCMountPathMap } from './utils';

export enum ConnectedNotebookContext {
  /** What PVCs are already connected to notebooks */
  EXISTING_PVC = 'pvc',
  /** What PVCs are allowed to be disconnected from notebooks */
  REMOVABLE_PVC = 'removable-pvc',
  /** What Data Connections are already connected to notebooks */
  EXISTING_DATA_CONNECTION = 'data-connection',
  /** What Data Connections are possible to connect to notebooks */
  POSSIBLE_DATA_CONNECTION = 'data-connection-possible',
}

export const useRelatedNotebooks = (
  context: ConnectedNotebookContext,
  resourceName?: string,
): { notebooks: NotebookKind[]; loaded: boolean; error: Error | undefined } => {
  const {
    notebooks: { data, loaded, error },
  } = React.useContext(ProjectDetailsContext);

  const connectedNotebooks = React.useMemo(() => {
    switch (context) {
      case ConnectedNotebookContext.EXISTING_PVC:
        if (!resourceName) {
          return [];
        }
        return data.reduce<NotebookKind[]>((acc, { notebook }) => {
          const relatedPVCNames = getNotebookPVCNames(notebook);
          if (!relatedPVCNames.includes(resourceName)) {
            return acc;
          }

          return [...acc, notebook];
        }, []);
      case ConnectedNotebookContext.REMOVABLE_PVC:
        if (!resourceName) {
          return [];
        }
        return data.reduce<NotebookKind[]>((acc, { notebook }) => {
          const relatedPVCNames = getNotebookPVCNames(notebook);
          if (!relatedPVCNames.includes(resourceName)) {
            return acc;
          }

          const pvcMountPathMap = getNotebookPVCMountPathMap(notebook);
          if (pvcMountPathMap[resourceName] === '/') {
            return acc;
          }

          return [...acc, notebook];
        }, []);
      case ConnectedNotebookContext.EXISTING_DATA_CONNECTION:
        if (!resourceName) {
          return [];
        }
        return data.reduce<NotebookKind[]>((acc, { notebook }) => {
          const relatedSecretNames = getNotebookSecretNames(notebook);
          if (!relatedSecretNames.includes(resourceName)) {
            return acc;
          }

          return [...acc, notebook];
        }, []);
      case ConnectedNotebookContext.POSSIBLE_DATA_CONNECTION:
        return data.reduce<NotebookKind[]>((acc, { notebook }) => {
          const relatedSecretNames = getNotebookSecretNames(notebook).filter((secretName) =>
            secretName.startsWith(DATA_CONNECTION_PREFIX),
          );
          if (relatedSecretNames.length > 0) {
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
