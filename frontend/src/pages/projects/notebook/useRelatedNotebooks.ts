import * as React from 'react';
import { NotebookKind } from '~/k8sTypes';
import { getNotebookPVCNames } from '~/pages/projects/pvc/utils';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getNotebookPVCMountPathMap } from './utils';

export enum ConnectedNotebookContext {
  /** What PVCs are already connected to notebooks */
  EXISTING_PVC = 'pvc',
  /** What PVCs are allowed to be disconnected from notebooks */
  REMOVABLE_PVC = 'removable-pvc',
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
