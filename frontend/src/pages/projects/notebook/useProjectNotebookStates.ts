import * as React from 'react';
import { getNotebook, getNotebooks } from '~/api';
import useFetchState, {
  AdHocUpdate,
  FetchState,
  FetchStateCallbackPromiseAdHoc,
  NotReadyError,
} from '~/utilities/useFetchState';
import { NotebookKind } from '~/k8sTypes';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import { NotebookDataState, NotebookState } from './types';
import { getNotebooksStatus, getNotebookStatus } from './service';

const refreshNotebookState = (
  notebookName: string,
  namespace: string,
): Promise<NotebookDataState | void> =>
  new Promise((resolve, reject) => {
    getNotebook(notebookName, namespace)
      .then((notebook) => {
        // Have a notebook, get a proper status of it
        getNotebookStatus(notebook)
          .then((notebookStatus) => {
            resolve(notebookStatus);
          })
          .catch(reject);
      })
      .catch(reject);
  });

export const getNotebooksStates = (
  notebooks: NotebookKind[],
): Promise<AdHocUpdate<NotebookState[]>> =>
  getNotebooksStatus(notebooks).then((state) => {
    const adhocUpdate: AdHocUpdate<NotebookState[]> = (lazySetState) => {
      // Save and overwrite everything immediately
      lazySetState(() =>
        state.map((currentState) => {
          // Setup each one to be able to refresh later
          const refresh = () => {
            const notebookName = currentState.notebook.metadata.name;
            return refreshNotebookState(
              notebookName,
              currentState.notebook.metadata.namespace,
            ).then((newState) => {
              lazySetState((notebookStates) => {
                if (newState) {
                  // Replace just the object that got refreshed
                  return notebookStates.map((s) =>
                    s.notebook.metadata.name === notebookName ? { ...newState, refresh } : s,
                  );
                }

                // For some reason, we didn't get one back -- remove it from the list
                return notebookStates.filter((s) => s.notebook.metadata.name === notebookName);
              });
            });
          };

          return {
            ...currentState,
            refresh,
          };
        }),
      );
    };
    return adhocUpdate;
  });

const useProjectNotebookStates = (
  namespace?: string,
  allowAll?: boolean,
): FetchState<NotebookState[]> => {
  const { projects } = React.useContext(ProjectsContext);
  const fetchAllNotebooks = React.useCallback<
    FetchStateCallbackPromiseAdHoc<NotebookState[]>
  >(() => {
    if (!namespace) {
      if (allowAll) {
        const getters = projects.map((p) => getNotebooks(p.metadata.name));
        return Promise.all(getters).then((results) => {
          const notebooks = results.reduce<NotebookKind[]>((acc, val) => acc.concat(val), []);
          return new Promise((resolve, reject) => {
            getNotebooksStates(notebooks)
              .then((updater) => resolve(updater))
              .catch(reject);
          });
        });
      }
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return new Promise((resolve, reject) => {
      getNotebooks(namespace)
        .then((notebooks) => {
          getNotebooksStates(notebooks).then((updater) => resolve(updater));
        })
        .catch(reject);
    });
  }, [namespace, allowAll, projects]);

  return useFetchState<NotebookState[]>(fetchAllNotebooks, [], { initialPromisePurity: true });
};

export default useProjectNotebookStates;
