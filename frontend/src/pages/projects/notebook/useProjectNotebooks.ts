import * as React from 'react';
import { getNotebook, getNotebooks } from '../../../api';
import { NotebookRefresh, NotebookState } from './types';
import { getNotebooksStatus, getNotebookStatus } from './service';

const useProjectNotebooks = (
  namespace?: string,
): [notebooks: NotebookState[], loaded: boolean, loadError: Error | undefined] => {
  const [notebookState, setNotebookState] = React.useState<NotebookState[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  const refreshNotebookState = React.useCallback(
    (notebookName: string): ReturnType<NotebookRefresh> => {
      if (!namespace) {
        return Promise.reject(new Error('Failed to refresh based on namespace issues'));
      }

      return new Promise((resolve, reject) => {
        getNotebook(notebookName, namespace)
          .then((notebook) => {
            getNotebookStatus(notebook)
              .then((notebookStatus) => {
                console.debug(notebookStatus);
                // Now that we have the latest state, update
                setNotebookState((notebookStates) =>
                  notebookStates.map((state) =>
                    state.notebook.metadata.name === notebookName
                      ? {
                          ...notebookStatus,
                          refresh: () => refreshNotebookState(notebookName),
                        }
                      : state,
                  ),
                );
                resolve();
              })
              .catch(reject);
          })
          .catch(reject);
      });
    },
    [namespace],
  );

  React.useEffect(() => {
    if (namespace) {
      getNotebooks(namespace)
        .then((notebooks) => {
          getNotebooksStatus(notebooks)
            .then((state) => {
              setNotebookState(
                state.map((state) => ({
                  ...state,
                  refresh: () => refreshNotebookState(state.notebook.metadata.name),
                })),
              );
              setLoaded(true);
            })
            .catch((e) => {
              setLoadError(e);
              setLoaded(true);
            });
        })
        .catch((e) => {
          setLoadError(e);
          setLoaded(true);
        });
    }
  }, [namespace, refreshNotebookState]);

  return [notebookState, loaded, loadError];
};

export default useProjectNotebooks;
