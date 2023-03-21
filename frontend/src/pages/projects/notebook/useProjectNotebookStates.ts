import * as React from 'react';
import { getNotebook, getNotebooks } from '~/api';
import useFetchState, {
  AdHocUpdate,
  FetchState,
  FetchStateCallbackPromiseAdHoc,
  NotReadyError,
} from '~/utilities/useFetchState';
import { NotebookDataState, NotebookState } from './types';
import { getNotebooksStatus, getNotebookStatus } from './service';

const refreshNotebookState = (
  notebookName: string,
  namespace: string,
): Promise<NotebookDataState | void> =>
  new Promise((resolve, reject) => {
    getNotebook(notebookName, namespace)
      .then((notebook) => {
        if (!notebook) {
          resolve();
          return;
        }

        // Have a notebook, get a proper status of it
        getNotebookStatus(notebook)
          .then((notebookStatus) => {
            resolve(notebookStatus);
          })
          .catch(reject);
      })
      .catch(reject);
  });

const useProjectNotebookStates = (namespace?: string): FetchState<NotebookState[]> => {
  const fetchAllNotebooks = React.useCallback<
    FetchStateCallbackPromiseAdHoc<NotebookState[]>
  >(() => {
    if (!namespace) {
      return Promise.reject(new NotReadyError('No namespace'));
    }

    return new Promise((resolve, reject) => {
      getNotebooks(namespace)
        .then((notebooks) => {
          getNotebooksStatus(notebooks)
            .then((state) => {
              const adhocUpdate: AdHocUpdate<NotebookState[]> = (lazySetState) => {
                // Save and overwrite everything immediately
                lazySetState(() =>
                  state.map((state) => {
                    // Setup each one to be able to refresh later
                    const refresh = () => {
                      const notebookName = state.notebook.metadata.name;
                      return refreshNotebookState(notebookName, namespace).then((newState) => {
                        lazySetState((notebookStates) => {
                          if (newState) {
                            // Replace just the object that got refreshed
                            return notebookStates.map((s) =>
                              s.notebook.metadata.name === notebookName
                                ? { ...newState, refresh }
                                : s,
                            );
                          }

                          // For some reason, we didn't get one back -- remove it from the list
                          return notebookStates.filter(
                            (s) => s.notebook.metadata.name === notebookName,
                          );
                        });
                      });
                    };

                    return {
                      ...state,
                      refresh,
                    };
                  }),
                );
              };
              resolve(adhocUpdate);
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }, [namespace]);

  return useFetchState<NotebookState[]>(fetchAllNotebooks, []);
};

export default useProjectNotebookStates;
