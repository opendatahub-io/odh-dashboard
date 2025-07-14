import * as React from 'react';
import { getNotebook, getNotebooks } from '#~/api';
import useFetch, {
  AdHocUpdate,
  FetchOptions,
  FetchStateObject,
  FetchStateCallbackPromiseAdHoc,
  NotReadyError,
} from '#~/utilities/useFetch';
import { NotebookKind } from '#~/k8sTypes';
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
  namespace: string,
): Promise<AdHocUpdate<NotebookState[]>> =>
  getNotebooksStatus(notebooks).then((state) => {
    const adhocUpdate: AdHocUpdate<NotebookState[]> = (lazySetState) => {
      // Save and overwrite everything immediately
      lazySetState(() =>
        state.map((currentState) => {
          // Setup each one to be able to refresh later
          const refresh = () => {
            const notebookName = currentState.notebook.metadata.name;
            return refreshNotebookState(notebookName, namespace).then((newState) => {
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
  fetchOptions?: Partial<FetchOptions>,
): FetchStateObject<NotebookState[]> => {
  const fetchAllNotebooks = React.useCallback<
    FetchStateCallbackPromiseAdHoc<NotebookState[]>
  >(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return new Promise((resolve, reject) => {
      getNotebooks(namespace)
        .then((notebooks) => {
          getNotebooksStates(notebooks, namespace).then((updater) => resolve(updater));
        })
        .catch(reject);
    });
  }, [namespace]);

  return useFetch<NotebookState[]>(fetchAllNotebooks, [], fetchOptions);
};

export default useProjectNotebookStates;
